-- Function : submit_cardinal
-- Arguments: p_batch_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.submit_cardinal(p_batch_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.submit_cardinal(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_batch return_batches;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status <> 'closed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch is "%s". Must be closed before submitting.', v_batch.status));
  END IF;

  UPDATE return_batches SET
    status                 = 'submitted',
    cardinal_file_generated = TRUE,
    cardinal_submitted_at   = NOW()
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object('error', false, 'data', _batch_to_json(v_batch));
END;
$function$;
