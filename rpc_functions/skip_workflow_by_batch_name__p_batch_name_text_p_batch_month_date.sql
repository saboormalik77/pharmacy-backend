-- Function : skip_workflow_by_batch_name
-- Arguments: p_batch_name text, p_batch_month date
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.skip_workflow_by_batch_name(p_batch_name text, p_batch_month date) CASCADE;

CREATE OR REPLACE FUNCTION public.skip_workflow_by_batch_name(p_batch_name text, p_batch_month date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_batch_id UUID;
  v_result jsonb;
BEGIN
  -- Find the batch (trim names — avoids mismatch from stray spaces)
  SELECT id INTO v_batch_id 
  FROM return_batches 
  WHERE TRIM(batch_name) = TRIM(p_batch_name) 
    AND batch_month = p_batch_month;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', true,
      'code', 404,
      'message', format('Batch "%s" for %s not found', p_batch_name, p_batch_month)
    );
  END IF;

  -- Call the main cleanup function
  SELECT skip_post_closeout_workflow(v_batch_id) INTO v_result;
  
  RETURN v_result;
END;
$function$;
