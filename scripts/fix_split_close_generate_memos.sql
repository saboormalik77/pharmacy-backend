-- FIX: Split close_batch into two operations
--
-- Before: close_batch validated + generated debit memos + closed the batch all at once.
-- After:
--   close_batch         → validates TBD/destination, sets status='closed'. NO memo generation.
--   generate_debit_memos_for_batch → generates debit memos for an already-closed batch.
--                           Called from Step 3 of the post-closeout stepper.
--
-- Run this ONCE in Supabase SQL Editor.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Replace close_batch — validation + close only, no memos
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION close_batch(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch     return_batches;
  v_tbd_count INTEGER;
  v_no_dest   INTEGER;
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

  -- Close the batch (debit memos are generated separately in Step 3)
  UPDATE return_batches SET
    status    = 'closed',
    closed_at = NOW()
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error', false,
    'data', _batch_to_json(v_batch),
    'memosGenerated', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION close_batch TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 2. New RPC: generate_debit_memos_for_batch
--    Called from Step 3 of the stepper modal.
--    Generates debit memos grouped by pharmacy + destination + labeler.
--    Safe to re-run: deletes existing memos for the batch first.
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

  -- Generate memos grouped by pharmacy + destination + labeler_id
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') AS labeler_id,
      COUNT(*)                                            AS item_count,
      COALESCE(SUM(rti.estimated_value), 0)               AS ask_value,
      MAX(NULLIF(TRIM(rti.manufacturer), ''))             AS scanned_manufacturer
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'
    GROUP BY rt.pharmacy_id, rti.destination,
             COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')
    ORDER BY rt.pharmacy_id, rti.destination
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');

    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_group.labeler_id
    LIMIT 1;

    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, v_group.destination,
      v_group.labeler_id,
      COALESCE(
        v_policy_name,
        NULLIF(TRIM(v_group.scanned_manufacturer), ''),
        ''
      ),
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
      AND COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') = v_group.labeler_id;

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
