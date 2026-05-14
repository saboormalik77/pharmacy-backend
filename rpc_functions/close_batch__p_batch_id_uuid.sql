-- Function : close_batch
-- Arguments: p_batch_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.close_batch(p_batch_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.close_batch(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
