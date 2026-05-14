-- Function : get_batch_permissions
-- Arguments: p_batch_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_batch_permissions(p_batch_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_batch_permissions(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_batch return_batches;
  v_memo_count INTEGER;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  SELECT COUNT(*) INTO v_memo_count FROM debit_memos WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'batchId', p_batch_id,
      'status', v_batch.status,
      'canDelete', v_batch.status = 'open' AND v_memo_count = 0,
      'canUnassignReturns', v_batch.status = 'open',
      'canAssignReturns', v_batch.status = 'open',
      'canClose', v_batch.status = 'open' AND v_batch.total_returns > 0,
      'canSubmitCardinal', v_batch.status = 'closed',
      'hasDebitMemos', v_memo_count > 0,
      'debitMemoCount', v_memo_count
    )
  );
END;
$function$;
