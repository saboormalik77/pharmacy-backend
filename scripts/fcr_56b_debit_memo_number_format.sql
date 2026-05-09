-- FCR-56b: Debit Memo Number Format — DEL{MMYY}{alpha}{labeler_id}
--
-- NEW FORMAT: DEL + MMYY + 3 uppercase letters + labeler_id (5 chars)
--   Example:  DEL0920AAA45802
--             └── constant
--                 └── batch month+year (Sep 2020 → 0920)
--                     └── sequence-encoded 3-alpha (AAA=1, AAB=2 … ZZZ=17576)
--                         └── NDC labeler code (first 5 digits of NDC)
--
-- The 3-alpha block is deterministic: seq → base-26 AAA…ZZZ.
-- This guarantees uniqueness within a batch without random collisions.
--
-- FILENAME MATCHING RULE
-- When a credit memo PDF is uploaded the system strips the leading "DEL" to
-- get the "key" (e.g. DEL0920AAA45802 → 0920AAA45802) and checks whether the
-- credit memo filename CONTAINS that key.  This RPC surfaces that lookup.
--
-- Run once in Supabase SQL Editor.
-- Existing memos are NOT affected (they keep their DM-… numbers).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Helper: memo_number_alpha(seq)
--    Converts an integer sequence (1-based) into a 3-char
--    uppercase alpha code (1→AAA, 2→AAB, …, 26→AAZ, 27→ABA …)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION memo_number_alpha(p_seq INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  -- Clamp to [1, 17576] so callers can never produce a corrupt chr() value.
  -- 17576 = 26^3 (ZZZ), sufficient for any realistic batch size.
  SELECT
    CHR(65 + (GREATEST(1, LEAST(p_seq, 17576)) - 1) / 676 % 26) ||
    CHR(65 + (GREATEST(1, LEAST(p_seq, 17576)) - 1) / 26  % 26) ||
    CHR(65 + (GREATEST(1, LEAST(p_seq, 17576)) - 1)        % 26);
$$;

GRANT EXECUTE ON FUNCTION memo_number_alpha TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 2. Update close_batch
--    Generates memo numbers in the new DEL format.
--    Only the DECLARE block and the memo-number assignment line change;
--    all validation and INSERT logic is identical to the last version
--    (fix_group_memos_by_manufacturer.sql).
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

  -- Check for TBD items across all batch returns
  SELECT COUNT(*) INTO v_tbd_count
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
   WHERE rt.batch_id = p_batch_id
     AND rti.return_status = 'tbd';

  IF v_tbd_count > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot close: %s item(s) still have TBD status. Resolve all items first.', v_tbd_count));
  END IF;

  -- Check for returnable items without destination
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

  -- Month code: MMYY (e.g. '0326' for March 2026)
  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  -- Delete any existing memos for this batch (idempotent re-run)
  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  -- Generate debit memos grouped by pharmacy + destination + manufacturer name
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
    v_labeler_id := v_group.primary_labeler_id;

    -- ── NEW FORMAT: DEL + MMYY + 3-alpha sequence + labeler_id ──
    v_memo_number := 'DEL' || v_month_code || memo_number_alpha(v_seq) || v_labeler_id;

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

    -- Populate debit_memo_items
    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,
      rti.lot_number,
      rti.expiration_date
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq := v_seq + 1;
  END LOOP;

  -- Close the batch
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
-- 3. Update generate_debit_memos_for_batch (same format change)
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

  -- Month code: MMYY
  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  -- Delete existing memos (idempotent re-run)
  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

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
    v_labeler_id := v_group.primary_labeler_id;

    -- ── NEW FORMAT: DEL + MMYY + 3-alpha sequence + labeler_id ──
    v_memo_number := 'DEL' || v_month_code || memo_number_alpha(v_seq) || v_labeler_id;

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
      quantity, ask_price, lot_number, expiration_date
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,
      rti.lot_number,
      rti.expiration_date
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count  := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq         := v_seq + 1;
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
-- 4. RPC: find_debit_memo_by_credit_filename(filename TEXT)
--
--    Given a credit memo filename, finds the debit memo whose
--    "key" (memo_number with the leading "DEL" stripped, or the
--    full memo_number if it doesn't start with DEL) appears
--    somewhere in the filename.
--
--    Returns the matching debit memo with its items so the
--    calling service can run the AI matching pipeline.
--
--    Example:
--      Credit memo filename: "AJHJH0926AAA45802_credit.pdf"
--      Debit memo number:    "DEL0926AAA45802"
--      Key:                  "0926AAA45802"
--      → filename contains key → match found.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_debit_memo_by_credit_filename(p_filename TEXT)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_memo  debit_memos;
  v_items jsonb;
BEGIN
  -- Scan all memo numbers; for each one derive the "key":
  --   DEL-prefixed  → strip "DEL" (3 chars)
  --   otherwise     → use the full memo_number
  -- Then check whether p_filename ILIKE '%<key>%'.
  -- We order by created_at DESC so the most recent memo wins when
  -- (in an edge case) two memos share the same key.
  SELECT dm.*
    INTO v_memo
    FROM debit_memos dm
   WHERE p_filename ILIKE '%' ||
         CASE
           WHEN dm.memo_number ILIKE 'DEL%' THEN SUBSTRING(dm.memo_number FROM 4)
           ELSE dm.memo_number
         END
         || '%'
   ORDER BY dm.created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error',   true,
      'code',    404,
      'message', 'No debit memo found matching credit memo filename: ' || p_filename
    );
  END IF;

  -- Fetch items for the matched memo
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',             dmi.id,
      'ndc',            dmi.ndc,
      'productName',    dmi.product_name,
      'quantity',       dmi.quantity,
      'askPrice',       dmi.ask_price,
      'lotNumber',      dmi.lot_number,
      'expirationDate', dmi.expiration_date
    ) ORDER BY dmi.product_name, dmi.ndc
  ), '[]'::jsonb)
  INTO v_items
  FROM debit_memo_items dmi WHERE dmi.debit_memo_id = v_memo.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',  _debit_memo_to_json(v_memo),
      'items', v_items
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION find_debit_memo_by_credit_filename TO authenticated, anon, service_role;
