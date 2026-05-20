-- Function : get_batch
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_batch(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_batch(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_row    return_batches;
  v_memos  jsonb;
  v_returns jsonb;
BEGIN
  SELECT * INTO v_row FROM return_batches WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(dm) ORDER BY dm.memo_number), '[]'::jsonb)
    INTO v_memos
    FROM debit_memos dm WHERE dm.batch_id = p_id;

  SELECT COALESCE(jsonb_agg(_rt_to_json(rt) ORDER BY rt.license_plate), '[]'::jsonb)
    INTO v_returns
    FROM return_transactions rt WHERE rt.batch_id = p_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'batch',      _batch_to_json(v_row),
      'debitMemos', v_memos,
      'returns',    v_returns
    )
  );
END;
$function$;
