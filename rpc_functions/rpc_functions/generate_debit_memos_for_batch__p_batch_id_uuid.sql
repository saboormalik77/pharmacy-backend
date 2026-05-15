-- Function : generate_debit_memos_for_batch
-- Arguments: p_batch_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.generate_debit_memos_for_batch(p_batch_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.generate_debit_memos_for_batch(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- Group by labeler_id (NDC prefix) instead of free-text manufacturer name
  -- to prevent duplicate memos when the same manufacturer has name variations
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') AS primary_labeler_id,
      MODE() WITHIN GROUP (
        ORDER BY COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
      )                                                   AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      COALESCE(SUM(rti.estimated_value), 0)               AS ask_value
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'
    GROUP BY rt.pharmacy_id, rti.destination,
             COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')
    ORDER BY rt.pharmacy_id, rti.destination, primary_labeler_id
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
      AND COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') = v_group.primary_labeler_id;

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
$function$;
