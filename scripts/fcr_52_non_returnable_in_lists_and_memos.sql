-- ============================================================
-- FCR-52: Surface non-returnable items in lists & debit memos
-- ============================================================
-- Business rule changes (from product owner):
--   1. Non-returnable items must continue to be recorded with a
--      well-defined `non_returnable_reason` chosen from the 18 RSI
--      standard reasons (provided by product team). Older legacy
--      values (`date`, `policy`, `no_data`, `manual`) remain valid
--      for backwards compatibility.
--   2. Non-returnable items must now appear:
--        - In manifest list data (alongside returnable items)
--        - In debit memos (as a separate group of "non-returnable"
--          items inside each memo, NOT counted toward the memo's
--          ask value or amount requested).
--   3. Pricing/payout calculations (`total_returnable_value`,
--      `total_value` on batches, debit memo `total_ask_value`,
--      `amount_requested`) MUST NOT change — they continue to
--      sum returnable items only.
--   4. Warehouse verification must REQUIRE a `non_returnable_reason`
--      whenever an item ends up classified as `non_returnable`.
--
-- This script is idempotent and safe to re-run.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Replace the old non_returnable_reason CHECK constraint
--    Allow the 18 new RSI reason codes + legacy values.
-- ────────────────────────────────────────────────────────────

ALTER TABLE return_transaction_items
  DROP CONSTRAINT IF EXISTS return_transaction_items_non_returnable_reason_check;

ALTER TABLE return_transaction_items
  ADD CONSTRAINT return_transaction_items_non_returnable_reason_check
  CHECK (
    non_returnable_reason IS NULL
    OR non_returnable_reason IN (
      -- New canonical reason codes (FCR-52)
      'manufacturer_no_returns',
      'sold_non_returnable',
      'manufacturer_no_partials',
      'repackaged',
      'too_far_past_expiration',
      'minimum_quantity_not_met',
      'sample',
      'rx_label_on_product',
      'label_defaced_or_damaged',
      'lot_non_returnable',
      'minimum_value_not_met',
      'other',
      'free_complimentary',
      'not_in_original_package',
      'overfilled_container',
      'too_far_in_date',
      'destroy_at_customer_request',
      'compounded',
      -- Legacy values kept for back-compat
      'date',
      'policy',
      'no_data',
      'manual'
    )
  );


-- ────────────────────────────────────────────────────────────
-- 2. Add `is_non_returnable` flag + `non_returnable_reason` to
--    debit_memo_items so the same memo can hold both groups.
--    Non-returnable rows DO NOT contribute to ask_price totals.
-- ────────────────────────────────────────────────────────────

ALTER TABLE debit_memo_items
  ADD COLUMN IF NOT EXISTS is_non_returnable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE debit_memo_items
  ADD COLUMN IF NOT EXISTS non_returnable_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_dmi_is_non_returnable
  ON debit_memo_items(is_non_returnable);


-- ────────────────────────────────────────────────────────────
-- 3. _rti_to_json — expose verificationStatus + actualQuantity
--    & non_returnable_reason so frontends can render badges.
--    All previously-exposed fields are preserved.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _rti_to_json(r return_transaction_items)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                      r.id,
    'transactionId',           r.transaction_id,
    'ndc',                     r.ndc,
    'ndc10',                   r.ndc_10,
    'gtin',                    r.gtin,
    'proprietaryName',         r.proprietary_name,
    'genericName',             r.generic_name,
    'manufacturer',            r.manufacturer,
    'packageDescription',      r.package_description,
    'dosageForm',              r.dosage_form,
    'strength',                r.strength,
    'route',                   r.route,
    'lotNumber',               r.lot_number,
    'serialNumber',            r.serial_number,
    'expirationDate',          r.expiration_date,
    'standardPrice',           r.standard_price,
    'quantity',                r.quantity,
    'fullPackageSize',         r.full_package_size,
    'fullPackageQtyReturned',  r.quantity_returned,
    'isPartial',               r.is_partial,
    'partialPercentage',       r.partial_percentage,
    'estimatedValue',          r.estimated_value,
    'estimatedStorePrice',     r.estimated_store_price,
    'estimatedStoreValue',     r.estimated_store_value,
    'returnStatus',            r.return_status,
    'nonReturnableReason',     r.non_returnable_reason,
    'returnReason',            r.return_reason,
    'destination',             r.destination,
    'deaSchedule',             r.dea_schedule,
    'deaForm222Required',      r.dea_form_222_required,
    'productType',             r.product_type,
    'coStatus',                r.co_status,
    'bmpStatus',               r.bmp_status,
    'memo',                    r.memo,
    'wineCellarId',            r.wine_cellar_id,
    'scanSource',              r.scan_source,
    'verified',                r.verified,
    'verificationStatus',      r.verification_status,
    'actualQuantity',          r.actual_quantity,
    'conditionNotes',          r.condition_notes,
    'createdAt',               r.created_at,
    'updatedAt',               r.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 4. warehouse_verify_item_v2 — preserve / set
--    non_returnable_reason whenever return_status flips to
--    `non_returnable`.
--
--    Behaviour (per FCR-50 + FCR-52):
--      * non-correct → return_status='non_returnable'
--          - if caller passed a reason, use it
--          - else fall back to a status-derived reason
--            (damaged/missing/wrong_item → label_defaced_or_damaged
--             /minimum_quantity_not_met/other)
--      * re-verify as correct → preserve previous reason but
--        the row is `returnable`, so reason is now informational.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION warehouse_verify_item_v2(
  p_transaction_id      UUID,
  p_item_id             UUID,
  p_verification_status TEXT,
  p_actual_quantity     INTEGER DEFAULT NULL,
  p_condition_notes     TEXT    DEFAULT NULL,
  p_reported_by         UUID    DEFAULT NULL,
  p_non_returnable_reason TEXT  DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn   return_transactions;
  v_item  return_transaction_items;
  v_disc  warehouse_discrepancies;
  v_reason TEXT;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_txn.status NOT IN ('received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot verify items for status "%s". Must be received.', v_txn.status));
  END IF;

  IF p_verification_status NOT IN ('correct', 'damaged', 'missing', 'wrong_item') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'verification_status must be: correct, damaged, missing, or wrong_item');
  END IF;

  SELECT * INTO v_item
    FROM return_transaction_items
   WHERE id = p_item_id AND transaction_id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Item not found in this return');
  END IF;

  -- Resolve reason for non-correct verifications
  IF p_verification_status <> 'correct' THEN
    v_reason := NULLIF(TRIM(COALESCE(p_non_returnable_reason, '')), '');
    IF v_reason IS NULL THEN
      v_reason := CASE p_verification_status
        WHEN 'damaged'    THEN 'label_defaced_or_damaged'
        WHEN 'missing'    THEN 'minimum_quantity_not_met'
        WHEN 'wrong_item' THEN 'other'
        ELSE 'other'
      END;
    END IF;
  ELSE
    v_reason := NULL; -- correct → reason cleared/handled below
  END IF;

  UPDATE return_transaction_items SET
    verified            = (p_verification_status = 'correct'),
    verification_status = p_verification_status,
    actual_quantity     = COALESCE(p_actual_quantity, actual_quantity),
    condition_notes     = COALESCE(p_condition_notes, condition_notes),
    return_status       = CASE
      WHEN p_verification_status != 'correct'
        THEN 'non_returnable'
      WHEN p_verification_status = 'correct'
        AND verification_status IS NOT NULL
        AND verification_status != 'correct'
        THEN 'returnable'
      ELSE return_status
    END,
    non_returnable_reason = CASE
      WHEN p_verification_status != 'correct'
        THEN v_reason
      WHEN p_verification_status = 'correct'
        AND verification_status IS NOT NULL
        AND verification_status != 'correct'
        THEN NULL
      ELSE non_returnable_reason
    END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  IF p_verification_status IN ('damaged', 'missing', 'wrong_item') THEN
    INSERT INTO warehouse_discrepancies (
      transaction_id, item_id, type, ndc, product_name,
      expected_quantity, actual_quantity, notes, reported_by
    ) VALUES (
      p_transaction_id,
      p_item_id,
      CASE p_verification_status
        WHEN 'damaged'    THEN 'damaged'
        WHEN 'missing'    THEN 'missing'
        WHEN 'wrong_item' THEN 'other'
      END,
      v_item.ndc,
      COALESCE(v_item.proprietary_name, v_item.generic_name),
      v_item.quantity,
      p_actual_quantity,
      COALESCE(p_condition_notes, format('Item marked as %s during verification', p_verification_status)),
      p_reported_by
    ) RETURNING * INTO v_disc;
  END IF;

  UPDATE return_transactions SET
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = p_transaction_id
         AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = p_transaction_id
         AND return_status = 'non_returnable'
    )
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',                  v_item.id,
      'transactionId',       v_item.transaction_id,
      'ndc',                 v_item.ndc,
      'proprietaryName',     v_item.proprietary_name,
      'genericName',         v_item.generic_name,
      'manufacturer',        v_item.manufacturer,
      'lotNumber',           v_item.lot_number,
      'expirationDate',      v_item.expiration_date,
      'quantity',            v_item.quantity,
      'actualQuantity',      v_item.actual_quantity,
      'verified',            v_item.verified,
      'verificationStatus',  v_item.verification_status,
      'conditionNotes',      v_item.condition_notes,
      'returnStatus',        v_item.return_status,
      'nonReturnableReason', v_item.non_returnable_reason,
      'destination',         v_item.destination,
      'estimatedValue',      v_item.estimated_value,
      'discrepancyId',       CASE WHEN v_disc.id IS NOT NULL THEN v_disc.id ELSE NULL END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION warehouse_verify_item_v2(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT)
  TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 5. resolve_transaction_item_with_auto_destination — keep the
--    reason intact when caller passes one. We update the
--    declared signature to include p_reason which already
--    existed; the only behaviour change is that the reason now
--    sticks to the row.
--
--    NOTE: We only re-create the body if the function exists
--    so we don't accidentally drop a different signature.
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Only redefine if the function exists with the expected signature
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'resolve_transaction_item_with_auto_destination'
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION resolve_transaction_item_with_auto_destination(
        p_item_id     UUID,
        p_new_status  TEXT,
        p_reason      TEXT DEFAULT NULL,
        p_destination TEXT DEFAULT NULL,
        p_memo        TEXT DEFAULT NULL
      )
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $inner$
      DECLARE
        v_item   return_transaction_items;
        v_dest   TEXT;
        v_reason TEXT;
      BEGIN
        SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
        IF NOT FOUND THEN
          RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
        END IF;

        v_dest := NULLIF(TRIM(COALESCE(p_destination, '')), '');

        IF p_new_status = 'returnable' THEN
          IF v_dest IS NULL THEN
            BEGIN
              v_dest := get_destination_for_ndc(v_item.ndc);
            EXCEPTION WHEN OTHERS THEN
              v_dest := NULL;
            END;
          END IF;
          v_reason := NULL;
        ELSIF p_new_status = 'non_returnable' THEN
          v_reason := NULLIF(TRIM(COALESCE(p_reason, '')), '');
          IF v_reason IS NULL THEN
            -- Fall back to legacy 'manual' if caller did not provide one
            v_reason := 'manual';
          END IF;
        END IF;

        UPDATE return_transaction_items SET
          return_status         = p_new_status,
          destination           = COALESCE(v_dest, destination),
          non_returnable_reason = CASE
            WHEN p_new_status = 'non_returnable' THEN v_reason
            WHEN p_new_status = 'returnable'    THEN NULL
            ELSE non_returnable_reason
          END,
          memo = COALESCE(NULLIF(TRIM(COALESCE(p_memo, '')), ''), memo)
        WHERE id = p_item_id
        RETURNING * INTO v_item;

        UPDATE return_transactions SET
          total_returnable_value = (
            SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
             WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
          ),
          total_non_returnable_value = (
            SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
             WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
          )
        WHERE id = v_item.transaction_id;

        RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
      END;
      $inner$;
    $body$;
  END IF;
END
$$;


-- ────────────────────────────────────────────────────────────
-- 6. close_batch — also surface non-returnable items in debit
--    memos. Pricing logic for memo (`total_items`,
--    `total_ask_value`, `amount_requested`) STILL only counts
--    returnable items — non-returnable rows are appended into
--    debit_memo_items with `is_non_returnable = TRUE` and
--    ask_price = 0.
--
--    Grouping is identical to the existing logic
--    (pharmacy + destination + manufacturer name) so a memo
--    will hold both groups for the same manufacturer.
--    Items that have no destination (typical for non-returnable
--    items routed to destruction) are grouped under their
--    actual destination string ('destruction', 'wine_cellar',
--    or NULL/empty).
--
--    Validation: We DROP the "no destination" check for
--    non-returnable items (they don't ship to a returner)
--    while keeping it strict for returnable items.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION close_batch(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch        return_batches;
  v_tbd_count    INTEGER;
  v_no_dest      INTEGER;
  v_memo_count   INTEGER := 0;
  v_total_value  DECIMAL(12,2) := 0;
  v_group        RECORD;
  v_memo         debit_memos;
  v_memo_number  TEXT;
  v_seq          INTEGER := 1;
  v_month_code   TEXT;
  v_policy_name  TEXT;
  v_labeler_id   TEXT;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status <> 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch is "%s". Only open batches can be closed.', v_batch.status));
  END IF;

  IF v_batch.total_returns = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot close batch with no assigned returns.');
  END IF;

  SELECT COUNT(*) INTO v_tbd_count
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
   WHERE rt.batch_id = p_batch_id
     AND rti.return_status = 'tbd';

  IF v_tbd_count > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot close: %s item(s) still have TBD status. Resolve all items first.', v_tbd_count));
  END IF;

  SELECT COUNT(*) INTO v_no_dest
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
   WHERE rt.batch_id = p_batch_id
     AND rti.return_status = 'returnable'
     AND (rti.destination IS NULL OR TRIM(rti.destination) = '');

  IF v_no_dest > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot close: %s returnable item(s) have no destination assigned.', v_no_dest));
  END IF;

  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  -- ─── Returnable groups: drive memo creation, totals, ask values
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      COALESCE(SUM(rti.estimated_value), 0)               AS ask_value,
      MODE() WITHIN GROUP (ORDER BY COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')) AS primary_labeler_id
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'
    GROUP BY rt.pharmacy_id, rti.destination,
             COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
    ORDER BY rt.pharmacy_id, rti.destination, manufacturer_name
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');
    v_labeler_id := v_group.primary_labeler_id;

    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_labeler_id
    LIMIT 1;

    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, v_group.destination,
      v_labeler_id,
      COALESCE(v_policy_name, v_group.manufacturer_name, ''),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    -- Returnable rows
    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,
      rti.lot_number,
      rti.expiration_date,
      FALSE,
      NULL
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    -- Non-returnable rows for the same (pharmacy, manufacturer)
    -- Destination on non-returnable rows is usually different from
    -- the returnable group, so we collapse them into the same memo
    -- regardless of destination. ask_price = 0 so memo totals are
    -- unaffected.
    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      0,
      rti.lot_number,
      rti.expiration_date,
      TRUE,
      rti.non_returnable_reason
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'non_returnable'
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq := v_seq + 1;
  END LOOP;

  -- ─── Non-returnable-only groups (manufacturers that have NO
  -- returnable items in this batch). These get their own memos
  -- with ask_value = 0 so they remain visible to admins.
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      MODE() WITHIN GROUP (ORDER BY COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')) AS primary_labeler_id
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'non_returnable'
      AND NOT EXISTS (
        SELECT 1
          FROM return_transaction_items rti2
          JOIN return_transactions rt2 ON rt2.id = rti2.transaction_id
         WHERE rt2.batch_id = p_batch_id
           AND rt2.pharmacy_id = rt.pharmacy_id
           AND rti2.return_status = 'returnable'
           AND COALESCE(NULLIF(TRIM(rti2.manufacturer), ''), 'Unknown Manufacturer')
               = COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
      )
    GROUP BY rt.pharmacy_id,
             COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
    ORDER BY rt.pharmacy_id, manufacturer_name
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');
    v_labeler_id := v_group.primary_labeler_id;

    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_labeler_id
    LIMIT 1;

    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, NULL,
      v_labeler_id,
      COALESCE(v_policy_name, v_group.manufacturer_name, ''),
      0, 0, 0
    ) RETURNING * INTO v_memo;

    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      0,
      rti.lot_number,
      rti.expiration_date,
      TRUE,
      rti.non_returnable_reason
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'non_returnable'
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count := v_memo_count + 1;
    v_seq := v_seq + 1;
  END LOOP;

  UPDATE return_batches SET
    status            = 'closed',
    closed_at         = NOW(),
    total_debit_memos = v_memo_count,
    total_value       = v_total_value
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error', false,
    'data', _batch_to_json(v_batch),
    'memosGenerated', v_memo_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION close_batch TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 7. generate_debit_memos_for_batch — same logic as close_batch
--    but for already-closed batches (Step 3 stepper).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_debit_memos_for_batch(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch       return_batches;
  v_memo_count  INTEGER := 0;
  v_total_value DECIMAL(12,2) := 0;
  v_group       RECORD;
  v_memo        debit_memos;
  v_memo_number TEXT;
  v_seq         INTEGER := 1;
  v_month_code  TEXT;
  v_policy_name TEXT;
  v_labeler_id  TEXT;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status NOT IN ('closed', 'submitted') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch must be closed before generating debit memos. Current status: "%s".', v_batch.status));
  END IF;

  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  -- Returnable-driven groups
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      COALESCE(SUM(rti.estimated_value), 0)               AS ask_value,
      MODE() WITHIN GROUP (ORDER BY COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')) AS primary_labeler_id
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'
    GROUP BY rt.pharmacy_id, rti.destination,
             COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
    ORDER BY rt.pharmacy_id, rti.destination, manufacturer_name
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');
    v_labeler_id := v_group.primary_labeler_id;

    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_labeler_id
    LIMIT 1;

    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, v_group.destination,
      v_labeler_id,
      COALESCE(v_policy_name, v_group.manufacturer_name, ''),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,
      rti.lot_number,
      rti.expiration_date,
      FALSE,
      NULL
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      0,
      rti.lot_number,
      rti.expiration_date,
      TRUE,
      rti.non_returnable_reason
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'non_returnable'
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count  := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq         := v_seq + 1;
  END LOOP;

  -- Non-returnable-only groups
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      MODE() WITHIN GROUP (ORDER BY COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')) AS primary_labeler_id
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'non_returnable'
      AND NOT EXISTS (
        SELECT 1
          FROM return_transaction_items rti2
          JOIN return_transactions rt2 ON rt2.id = rti2.transaction_id
         WHERE rt2.batch_id = p_batch_id
           AND rt2.pharmacy_id = rt.pharmacy_id
           AND rti2.return_status = 'returnable'
           AND COALESCE(NULLIF(TRIM(rti2.manufacturer), ''), 'Unknown Manufacturer')
               = COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
      )
    GROUP BY rt.pharmacy_id,
             COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
    ORDER BY rt.pharmacy_id, manufacturer_name
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');
    v_labeler_id := v_group.primary_labeler_id;

    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_labeler_id
    LIMIT 1;

    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, NULL,
      v_labeler_id,
      COALESCE(v_policy_name, v_group.manufacturer_name, ''),
      0, 0, 0
    ) RETURNING * INTO v_memo;

    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      0,
      rti.lot_number,
      rti.expiration_date,
      TRUE,
      rti.non_returnable_reason
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'non_returnable'
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count := v_memo_count + 1;
    v_seq := v_seq + 1;
  END LOOP;

  UPDATE return_batches SET
    total_debit_memos = v_memo_count,
    total_value       = v_total_value
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error',          false,
    'data',           _batch_to_json(v_batch),
    'memosGenerated', v_memo_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_debit_memos_for_batch TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 8. get_debit_memo — return non-returnable items separately
--    so frontends can display them in their own table.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_debit_memo(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_memo                 debit_memos;
  v_items_returnable     jsonb;
  v_items_non_returnable jsonb;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                  dmi.id,
      'debitMemoId',         dmi.debit_memo_id,
      'transactionItemId',   dmi.transaction_item_id,
      'ndc',                 dmi.ndc,
      'productName',         dmi.product_name,
      'quantity',            dmi.quantity,
      'askPrice',            dmi.ask_price,
      'receivedPrice',       dmi.received_price,
      'lotNumber',           dmi.lot_number,
      'expirationDate',      dmi.expiration_date,
      'isNonReturnable',     dmi.is_non_returnable,
      'nonReturnableReason', dmi.non_returnable_reason,
      'createdAt',           dmi.created_at
    ) ORDER BY dmi.product_name, dmi.ndc
  ), '[]'::jsonb)
  INTO v_items_returnable
  FROM debit_memo_items dmi
  WHERE dmi.debit_memo_id = p_id
    AND COALESCE(dmi.is_non_returnable, FALSE) = FALSE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                  dmi.id,
      'debitMemoId',         dmi.debit_memo_id,
      'transactionItemId',   dmi.transaction_item_id,
      'ndc',                 dmi.ndc,
      'productName',         dmi.product_name,
      'quantity',            dmi.quantity,
      'askPrice',            dmi.ask_price,
      'receivedPrice',       dmi.received_price,
      'lotNumber',           dmi.lot_number,
      'expirationDate',      dmi.expiration_date,
      'isNonReturnable',     dmi.is_non_returnable,
      'nonReturnableReason', dmi.non_returnable_reason,
      'createdAt',           dmi.created_at
    ) ORDER BY dmi.product_name, dmi.ndc
  ), '[]'::jsonb)
  INTO v_items_non_returnable
  FROM debit_memo_items dmi
  WHERE dmi.debit_memo_id = p_id
    AND COALESCE(dmi.is_non_returnable, FALSE) = TRUE;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',               _debit_memo_to_json(v_memo),
      'items',              v_items_returnable,
      'nonReturnableItems', v_items_non_returnable
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_debit_memo TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 9. get_manifest_data — surface non-returnable items in
--    `nonReturnableItems` (was always empty before).
--    `summary.nonReturnableCount` and `totalNonReturnableValue`
--    now also reflect non-returnable rows.
--    `totalReturnableValue` and the manifest's `totalValue`
--    REMAIN unchanged (only count returnable rows).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_manifest_data(p_transaction_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn              return_transactions;
  v_pharmacy         RECORD;
  v_processor_name   TEXT;
  v_returnable_items jsonb;
  v_non_returnable   jsonb;
  v_item_count       INTEGER;
  v_returnable_count INTEGER;
  v_non_ret_count    INTEGER;
  v_returnable_value DECIMAL(12,2);
  v_non_ret_value    DECIMAL(12,2);
  v_has_cii          BOOLEAN;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  SELECT id, pharmacy_name, npi_number, dea_number, phone, email
  INTO v_pharmacy
  FROM pharmacy
  WHERE id = v_txn.pharmacy_id;

  SELECT name INTO v_processor_name FROM processors WHERE id = v_txn.processor_id;

  -- Returnable items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',                 rti.ndc,
      'ndc10',               rti.ndc_10,
      'proprietaryName',     rti.proprietary_name,
      'genericName',         rti.generic_name,
      'manufacturer',        rti.manufacturer,
      'lotNumber',           rti.lot_number,
      'expirationDate',      rti.expiration_date,
      'quantity',            rti.quantity,
      'standardPrice',       rti.standard_price,
      'estimatedValue',      rti.estimated_value,
      'destination',         rti.destination,
      'deaSchedule',         rti.dea_schedule,
      'isPartial',           rti.is_partial,
      'partialPercentage',   rti.partial_percentage,
      'strength',            rti.strength,
      'dosageForm',          rti.dosage_form,
      'returnStatus',        rti.return_status,
      'nonReturnableReason', rti.non_returnable_reason
    ) ORDER BY rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_returnable_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.return_status = 'returnable';

  -- Non-returnable items (now included)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',                 rti.ndc,
      'ndc10',               rti.ndc_10,
      'proprietaryName',     rti.proprietary_name,
      'genericName',         rti.generic_name,
      'manufacturer',        rti.manufacturer,
      'lotNumber',           rti.lot_number,
      'expirationDate',      rti.expiration_date,
      'quantity',            rti.quantity,
      'standardPrice',       rti.standard_price,
      'estimatedValue',      rti.estimated_value,
      'destination',         rti.destination,
      'deaSchedule',         rti.dea_schedule,
      'isPartial',           rti.is_partial,
      'partialPercentage',   rti.partial_percentage,
      'strength',            rti.strength,
      'dosageForm',          rti.dosage_form,
      'returnStatus',        rti.return_status,
      'nonReturnableReason', rti.non_returnable_reason
    ) ORDER BY COALESCE(rti.non_returnable_reason, ''), rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_non_returnable
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.return_status = 'non_returnable';

  -- Counts: include both groups for visibility, but values for
  -- pricing remain returnable-only (totalValue == returnable).
  SELECT COUNT(*) INTO v_item_count
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status IN ('returnable', 'non_returnable', 'tbd');

  SELECT COUNT(*) INTO v_returnable_count
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'returnable';

  SELECT COUNT(*) INTO v_non_ret_count
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'non_returnable';

  SELECT COALESCE(SUM(estimated_value), 0) INTO v_returnable_value
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'returnable';

  SELECT COALESCE(SUM(estimated_value), 0) INTO v_non_ret_value
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'non_returnable';

  SELECT EXISTS(
    SELECT 1 FROM return_transaction_items
    WHERE transaction_id = p_transaction_id
      AND dea_form_222_required = true
  ) INTO v_has_cii;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction', jsonb_build_object(
        'id',                      v_txn.id,
        'licensePlate',            v_txn.license_plate,
        'status',                  v_txn.status,
        'fedexTracking',           v_txn.fedex_tracking,
        'fedexPickupConfirmation', v_txn.fedex_pickup_confirmation,
        'boxCount',                v_txn.box_count,
        'serviceType',             v_txn.service_type,
        'timeIn',                  v_txn.time_in,
        'timeOut',                 v_txn.time_out,
        'finalizedAt',             v_txn.finalized_at,
        'notes',                   v_txn.notes,
        'createdAt',               v_txn.created_at
      ),
      'pharmacy', jsonb_build_object(
        'id',           v_pharmacy.id,
        'name',         v_pharmacy.pharmacy_name,
        'npiNumber',    v_pharmacy.npi_number,
        'deaNumber',    v_pharmacy.dea_number,
        'phone',        v_pharmacy.phone,
        'email',        v_pharmacy.email
      ),
      'processor', jsonb_build_object(
        'id',   v_txn.processor_id,
        'name', v_processor_name
      ),
      'summary', jsonb_build_object(
        'totalItems',              v_item_count,
        'returnableCount',         v_returnable_count,
        'nonReturnableCount',      v_non_ret_count,
        'totalReturnableValue',    v_returnable_value,
        'totalNonReturnableValue', v_non_ret_value,
        'totalValue',              v_returnable_value,
        'hasCiiItems',             v_has_cii
      ),
      'returnableItems',    v_returnable_items,
      'nonReturnableItems', v_non_returnable
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_manifest_data TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 10. Comments / metadata
-- ────────────────────────────────────────────────────────────

COMMENT ON FUNCTION close_batch(UUID) IS
  'Close a batch + generate debit memos; non-returnable items are now appended to memos with is_non_returnable=TRUE and ask_price=0 (FCR-52).';
COMMENT ON FUNCTION generate_debit_memos_for_batch(UUID) IS
  'Re-generate memos for a closed batch; appends non-returnable items as is_non_returnable=TRUE rows (FCR-52).';
COMMENT ON FUNCTION get_debit_memo(UUID) IS
  'Returns memo + returnable items + non_returnable items split arrays (FCR-52).';
COMMENT ON FUNCTION get_manifest_data(UUID) IS
  'Returns manifest data; nonReturnableItems is now populated (FCR-52). totalValue/totalReturnableValue still only count returnable rows.';
COMMENT ON FUNCTION warehouse_verify_item_v2(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT) IS
  'Verify an item; non-correct verifications now persist a non_returnable_reason (FCR-52).';
