-- Function : skip_post_closeout_workflow
-- Arguments: p_batch_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.skip_post_closeout_workflow(p_batch_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.skip_post_closeout_workflow(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_batch return_batches;
  v_memo_count INTEGER;
  v_deleted_memos INTEGER := 0;
BEGIN
  -- Get the batch
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', true, 
      'code', 404, 
      'message', 'Batch not found'
    );
  END IF;

  -- Clear Post-Closeout Workflow stepper (UI reads batch_workflow_steps)
  DELETE FROM batch_workflow_steps WHERE batch_id = p_batch_id;

  -- Delete $0.00 debit memos (non-returnable items)
  DELETE FROM debit_memos 
  WHERE batch_id = p_batch_id 
    AND total_ask_value = 0;
  
  GET DIAGNOSTICS v_deleted_memos = ROW_COUNT;

  -- Count remaining memos
  SELECT COUNT(*) INTO v_memo_count 
  FROM debit_memos 
  WHERE batch_id = p_batch_id;

  -- Update batch totals
  UPDATE return_batches 
  SET 
    total_debit_memos = v_memo_count,
    total_value = COALESCE((
      SELECT SUM(total_ask_value) 
      FROM debit_memos 
      WHERE batch_id = p_batch_id
    ), 0),
    -- Reset workflow flags to allow going back to closeout form
    cardinal_file_generated = FALSE,
    cardinal_file_url = NULL,
    cardinal_submitted_at = NULL,
    cardinal_approved_at = NULL,
    updated_at = NOW()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Post-closeout workflow skipped successfully',
    'deletedMemos', v_deleted_memos,
    'remainingMemos', v_memo_count,
    'batchId', p_batch_id
  );
END;
$function$;
