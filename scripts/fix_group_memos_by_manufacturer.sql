-- FIX: Group debit memos by manufacturer name and destination
--
-- Before: Grouped by (pharmacy_id, destination, labeler_id from NDC)
--         This creates separate memos for same manufacturer with different NDC prefixes
--
-- After:  Group by (pharmacy_id, destination, manufacturer name)
--         All products from same manufacturer + destination go into ONE memo
--
-- Run this ONCE in Supabase SQL Editor.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- Update: generate_debit_memos_for_batch
-- Now groups by manufacturer name instead of labeler_id
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

  -- Month code for memo numbers (e.g. '0326' for March 2026)
  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  -- Delete existing memos (idempotent re-run)
  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  -- Generate memos grouped by pharmacy + destination + manufacturer name
  -- This ensures products with same manufacturer + destination are in ONE memo
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      COALESCE(SUM(rti.estimated_value), 0)               AS ask_value,
      -- Pick the most common labeler_id (first 5 digits of NDC) for this manufacturer group
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

    -- Try to get policy name from manufacturer_policies using the primary labeler_id
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
      COALESCE(
        v_policy_name,
        v_group.manufacturer_name,
        ''
      ),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    -- Populate debit_memo_items
    -- Include ALL items with matching manufacturer name + destination
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

  -- Update batch totals
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
-- Also update close_batch function to use same grouping logic
-- (This function is called first, then generate_debit_memos_for_batch)
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

  -- Month code for memo number (e.g. '0326' for March 2026)
  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  -- Delete any existing memos for this batch (in case of re-run)
  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  -- Generate debit memos grouped by pharmacy + destination + manufacturer name
  -- This ensures products with same manufacturer + destination are in ONE memo
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)               AS item_count,
      COALESCE(SUM(rti.estimated_value), 0) AS ask_value,
      -- Pick the most common labeler_id for this manufacturer group
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

    -- Try to get policy name from manufacturer_policies using the primary labeler_id
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
      COALESCE(
        v_policy_name,
        v_group.manufacturer_name,
        ''
      ),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    -- Populate debit_memo_items
    -- Include ALL items with matching manufacturer name + destination
    INSERT INTO debit_memo_items (debit_memo_id, transaction_item_id, ndc, product_name, quantity, ask_price, lot_number, expiration_date)
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
GRANT EXECUTE ON FUNCTION generate_debit_memos_for_batch TO authenticated, anon, service_role;
