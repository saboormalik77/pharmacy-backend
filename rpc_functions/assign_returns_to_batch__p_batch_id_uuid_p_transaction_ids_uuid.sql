-- Function : assign_returns_to_batch
-- Arguments: p_batch_id uuid, p_transaction_ids uuid[]
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.assign_returns_to_batch(p_batch_id uuid, p_transaction_ids uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.assign_returns_to_batch(p_batch_id uuid, p_transaction_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
