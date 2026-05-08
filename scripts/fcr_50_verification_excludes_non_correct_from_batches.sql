-- ============================================================
-- FCR-50: Exclude non-correct items from batches & downstream
-- ============================================================
-- After warehouse verification, only items verified as "correct"
-- should proceed to batching, debit memos, and all subsequent
-- steps.  Non-correct items must NEVER be shipped to a reverse
-- distributor.
--
-- Changes:
--   1. _rt_to_json           — totalItems & totalReturnableValue
--                               now exclude items with a non-correct
--                               verification_status.
--   2. warehouse_verify_item_v2 — immediately sets return_status
--                               to 'non_returnable' for non-correct
--                               items and recalculates return totals.
--                               Re-verifying as 'correct' restores
--                               return_status to 'returnable'.
--   3. warehouse_complete_verification — safety net: marks any
--                               remaining non-correct items as
--                               non_returnable and recalculates.
--   4. assign_returns_to_batch — accepts 'verified' status so
--                               returns that passed FCR-47 can be
--                               assigned to batches.
--   5. One-time data fix     — retroactively fixes return_status
--                               and totals for items verified before
--                               this migration.
--
-- Requires: FCR-47, FCR-49.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. _rt_to_json — exclude non-correct verified items from
--    totalItems and totalReturnableValue.
--    Items with verification_status = NULL (not yet verified)
--    are still counted normally.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _rt_to_json(r return_transactions)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'licensePlate',             r.license_plate,
    'pharmacyId',               r.pharmacy_id,
    'pharmacyName',             COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = r.pharmacy_id), ''),
    'processorId',              r.processor_id,
    'processorName',            COALESCE((SELECT name FROM processors WHERE id = r.processor_id), ''),
    'serviceType',              r.service_type,
    'status',                   r.status,
    'fedexTracking',            r.fedex_tracking,
    'fedexPickupConfirmation',  r.fedex_pickup_confirmation,
    'totalItems',               (SELECT COUNT(*)::INTEGER
                                   FROM return_transaction_items
                                  WHERE transaction_id = r.id
                                    AND return_status IN ('returnable', 'tbd')
                                    AND (verification_status IS NULL OR verification_status = 'correct')),
    'totalReturnableValue',     (SELECT COALESCE(SUM(estimated_value), 0)
                                   FROM return_transaction_items
                                  WHERE transaction_id = r.id
                                    AND return_status = 'returnable'
                                    AND (verification_status IS NULL OR verification_status = 'correct')),
    'totalNonReturnableValue',  (SELECT COALESCE(SUM(estimated_value), 0)
                                   FROM return_transaction_items
                                  WHERE transaction_id = r.id
                                    AND return_status = 'non_returnable'),
    'batchId',                  r.batch_id,
    'timeIn',                   r.time_in,
    'timeOut',                  r.time_out,
    'receivedInWarehouseDate',  r.received_in_warehouse_date,
    'verifiedIntegrity',        r.verified_integrity,
    'notes',                    r.notes,
    'finalizedAt',              r.finalized_at,
    'boxCount',                 r.box_count,
    'manifestGeneratedAt',      r.manifest_generated_at,
    'prpNumber',                r.prp_number,
    'packageTracking',          r.package_tracking,
    'scannedPackages',          r.scanned_packages,
    'fedexShipmentId',          r.fedex_shipment_id,
    'fedexLabels',              r.fedex_labels,
    'finalizeSteps',            COALESCE(r.finalize_steps, '{"printManifest": false, "fedexEntered": false, "printJobSheets": false}'::jsonb),
    'verifiedAt',               r.verified_at,
    'verifiedBy',               r.verified_by,
    'piecesReceived',           r.pieces_received,
    'verificationCompletedAt',  r.verification_completed_at,
    'verificationStatus',
      CASE
        WHEN r.verification_completed_at IS NOT NULL
          OR r.status IN ('verified', 'closed', 'closed_out')
          OR (r.status = 'received' AND r.verified_integrity IS TRUE)
        THEN 'completed'
        WHEN r.status = 'received'
          AND r.verification_completed_at IS NULL
          AND r.verified_at IS NOT NULL
          AND COALESCE(r.verified_integrity, false) = false
        THEN 'in_progress'
        WHEN r.status = 'received'
          AND r.verification_completed_at IS NULL
          AND r.verified_at IS NULL
        THEN 'not_started'
        ELSE NULL
      END,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;

COMMENT ON FUNCTION _rt_to_json(return_transactions) IS
  'Return transaction as JSON for APIs; excludes non-correct verified items from totalItems/totalReturnableValue (FCR-50).';


-- ────────────────────────────────────────────────────────────
-- 2. warehouse_verify_item_v2 — immediately update return_status
--    when verifying an item, and recalculate return totals.
--
--    Non-correct → return_status = 'non_returnable'
--    Re-verified as correct (was previously non-correct)
--        → return_status = 'returnable'
--    First-time correct → return_status unchanged
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION warehouse_verify_item_v2(
  p_transaction_id      UUID,
  p_item_id             UUID,
  p_verification_status TEXT,
  p_actual_quantity     INTEGER DEFAULT NULL,
  p_condition_notes     TEXT    DEFAULT NULL,
  p_reported_by         UUID   DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn   return_transactions;
  v_item  return_transaction_items;
  v_disc  warehouse_discrepancies;
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

  -- Update the item.
  -- return_status logic (references to columns are OLD values):
  --   • non-correct  → 'non_returnable' always
  --   • correct AND previously non-correct (re-verify) → 'returnable'
  --   • correct AND first verify / was already correct → keep current
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
    END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Auto-create discrepancy for non-correct items
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

  -- Recalculate stored totals on the return transaction so that
  -- list endpoints, batch value calculations, etc. are always current.
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
      'id',                 v_item.id,
      'transactionId',      v_item.transaction_id,
      'ndc',                v_item.ndc,
      'proprietaryName',    v_item.proprietary_name,
      'genericName',        v_item.generic_name,
      'manufacturer',       v_item.manufacturer,
      'lotNumber',          v_item.lot_number,
      'expirationDate',     v_item.expiration_date,
      'quantity',           v_item.quantity,
      'actualQuantity',     v_item.actual_quantity,
      'verified',           v_item.verified,
      'verificationStatus', v_item.verification_status,
      'conditionNotes',     v_item.condition_notes,
      'returnStatus',       v_item.return_status,
      'destination',        v_item.destination,
      'estimatedValue',     v_item.estimated_value,
      'discrepancyId',      CASE WHEN v_disc.id IS NOT NULL THEN v_disc.id ELSE NULL END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION warehouse_verify_item_v2(UUID, UUID, TEXT, INTEGER, TEXT, UUID)
  TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 3. warehouse_complete_verification — safety net.
--    Marks any remaining non-correct items as non_returnable
--    (items should already be updated from step 2, but this
--    ensures nothing slips through) and recalculates totals.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION warehouse_complete_verification(
  p_transaction_id UUID,
  p_notes          TEXT DEFAULT NULL,
  p_verified_by    UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn               return_transactions;
  v_total_items       INTEGER;
  v_verified_count    INTEGER;
  v_correct_count     INTEGER;
  v_damaged_count     INTEGER;
  v_missing_count     INTEGER;
  v_wrong_count       INTEGER;
  v_unverified_count  INTEGER;
  v_surplus_count     INTEGER;
  v_open_disc         INTEGER;
  v_correct_value     DECIMAL(12,2);
  v_excluded_count    INTEGER;
  v_new_returnable    DECIMAL(12,2);
  v_new_non_ret       DECIMAL(12,2);
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_txn.status NOT IN ('received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot complete verification for status "%s". Must be received.', v_txn.status));
  END IF;

  -- Count items by verification status
  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_verified_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status IS NOT NULL;

  SELECT COUNT(*) INTO v_correct_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'correct';

  SELECT COUNT(*) INTO v_damaged_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'damaged';

  SELECT COUNT(*) INTO v_missing_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'missing';

  SELECT COUNT(*) INTO v_wrong_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'wrong_item';

  v_unverified_count := v_total_items - v_verified_count;

  IF v_unverified_count > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('%s item(s) have not been verified yet. Please verify all items before completing.', v_unverified_count));
  END IF;

  -- Count surplus and open discrepancies
  SELECT COUNT(*) INTO v_surplus_count
    FROM warehouse_surplus_items WHERE transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_open_disc
    FROM warehouse_discrepancies WHERE transaction_id = p_transaction_id AND status = 'open';

  -- Value of correct items only
  SELECT COALESCE(SUM(estimated_value), 0) INTO v_correct_value
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'correct';

  -- Safety net: force non-correct items to non_returnable
  -- (warehouse_verify_item_v2 already does this per-item, but this
  --  catches any items verified before FCR-50 was deployed)
  UPDATE return_transaction_items
  SET return_status = 'non_returnable'
  WHERE transaction_id = p_transaction_id
    AND verification_status IS NOT NULL
    AND verification_status != 'correct'
    AND return_status IN ('returnable', 'tbd');
  GET DIAGNOSTICS v_excluded_count = ROW_COUNT;

  -- Recalculate stored totals
  SELECT
    COALESCE(SUM(estimated_value) FILTER (WHERE return_status = 'returnable'), 0),
    COALESCE(SUM(estimated_value) FILTER (WHERE return_status = 'non_returnable'), 0)
  INTO v_new_returnable, v_new_non_ret
  FROM return_transaction_items
  WHERE transaction_id = p_transaction_id;

  -- Mark the return as verified / completed
  UPDATE return_transactions SET
    status                     = 'verified',
    verified_integrity         = (v_damaged_count = 0 AND v_missing_count = 0 AND v_wrong_count = 0),
    verification_completed_at  = NOW(),
    verified_at                = COALESCE(verified_at, NOW()),
    verified_by                = COALESCE(p_verified_by, verified_by),
    notes                      = COALESCE(p_notes, notes),
    total_returnable_value     = v_new_returnable,
    total_non_returnable_value = v_new_non_ret
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction',   _rt_to_json(v_txn),
      'summary', jsonb_build_object(
        'totalItems',        v_total_items,
        'correctItems',      v_correct_count,
        'damagedItems',      v_damaged_count,
        'missingItems',      v_missing_count,
        'wrongItems',        v_wrong_count,
        'surplusItems',      v_surplus_count,
        'openDiscrepancies', v_open_disc,
        'correctItemsValue', v_correct_value,
        'allItemsIntact',    (v_damaged_count = 0 AND v_missing_count = 0 AND v_wrong_count = 0),
        'excludedFromBatch', v_excluded_count
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION warehouse_complete_verification(UUID, TEXT, UUID)
  TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 4. assign_returns_to_batch — accept 'verified' status
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION assign_returns_to_batch(
  p_batch_id        UUID,
  p_transaction_ids UUID[]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch   return_batches;
  v_txn     return_transactions;
  v_count   INTEGER := 0;
  v_value   DECIMAL(12,2) := 0;
  v_tid     UUID;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status <> 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch is "%s". Only open batches can accept returns.', v_batch.status));
  END IF;

  FOREACH v_tid IN ARRAY p_transaction_ids LOOP
    SELECT * INTO v_txn FROM return_transactions WHERE id = v_tid;
    IF NOT FOUND THEN CONTINUE; END IF;

    IF v_txn.status NOT IN ('received', 'verified', 'closed_out') THEN CONTINUE; END IF;

    IF v_txn.batch_id IS NOT NULL AND v_txn.batch_id <> p_batch_id THEN CONTINUE; END IF;

    UPDATE return_transactions SET batch_id = p_batch_id WHERE id = v_tid;
    v_count := v_count + 1;
    v_value := v_value + COALESCE(v_txn.total_returnable_value, 0);
  END LOOP;

  UPDATE return_batches SET
    total_returns = (SELECT COUNT(*) FROM return_transactions WHERE batch_id = p_batch_id),
    total_value   = (SELECT COALESCE(SUM(total_returnable_value), 0) FROM return_transactions WHERE batch_id = p_batch_id)
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error', false,
    'data', _batch_to_json(v_batch),
    'assigned', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION assign_returns_to_batch(UUID, UUID[])
  TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 5. One-time data fix
--    Retroactively update return_status for items that were
--    verified as non-correct BEFORE this migration was deployed.
--    Also recalculate totals on the affected return transactions.
-- ────────────────────────────────────────────────────────────

-- Fix items
UPDATE return_transaction_items
SET return_status = 'non_returnable'
WHERE verification_status IS NOT NULL
  AND verification_status != 'correct'
  AND return_status IN ('returnable', 'tbd');

-- Recalculate totals for every return that has at least one verified item
UPDATE return_transactions rt SET
  total_returnable_value = sub.ret_val,
  total_non_returnable_value = sub.non_ret_val
FROM (
  SELECT
    transaction_id,
    COALESCE(SUM(estimated_value) FILTER (WHERE return_status = 'returnable'), 0) AS ret_val,
    COALESCE(SUM(estimated_value) FILTER (WHERE return_status = 'non_returnable'), 0) AS non_ret_val
  FROM return_transaction_items
  WHERE transaction_id IN (
    SELECT DISTINCT transaction_id
      FROM return_transaction_items
     WHERE verification_status IS NOT NULL
  )
  GROUP BY transaction_id
) sub
WHERE rt.id = sub.transaction_id;


-- ────────────────────────────────────────────────────────────
-- 6. Notes
-- ────────────────────────────────────────────────────────────
-- No changes needed to close_batch or generate_debit_memos_for_batch:
--   • TBD check: counts items with return_status = 'tbd'. Non-correct
--     items are now 'non_returnable', so they don't block the close.
--   • Debit memo generation: filters on return_status = 'returnable'.
--     Non-correct items are 'non_returnable' → excluded automatically.
--   • Destination check: filters on return_status = 'returnable'.
--     Non-correct items won't trigger a missing-destination error.
--
-- The combination of _rt_to_json verification_status filter (display)
-- and return_status = 'non_returnable' (data) provides belt-and-
-- suspenders coverage:
--   • _rt_to_json catches items even if return_status wasn't updated
--   • return_status catches items in queries that don't use _rt_to_json
--     (close_batch, generate_debit_memos_for_batch, batch totals)

COMMENT ON FUNCTION _rt_to_json(return_transactions) IS
  'Return transaction as JSON for APIs; excludes non-correct verified items from totalItems/totalReturnableValue (FCR-50).';

COMMENT ON FUNCTION warehouse_verify_item_v2(UUID, UUID, TEXT, INTEGER, TEXT, UUID) IS
  'Verify a single item with status. Immediately updates return_status and recalculates return totals (FCR-50).';

COMMENT ON FUNCTION warehouse_complete_verification(UUID, TEXT, UUID) IS
  'Complete warehouse verification. Safety-net: ensures non-correct items are non_returnable (FCR-50).';

COMMENT ON FUNCTION assign_returns_to_batch(UUID, UUID[]) IS
  'Assign returns to a batch. Accepts received, verified, or closed_out returns (FCR-50).';
