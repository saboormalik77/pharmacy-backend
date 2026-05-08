-- ============================================================
-- FCR-55: Skip Post-Closeout Workflow and move batch to closeout form
-- ============================================================
-- This script will:
-- 1. Delete the problematic $0.00 debit memos
-- 2. Reset the batch status to allow it to go to closeout form
-- 3. Clean up any workflow tracking data

-- ────────────────────────────────────────────────────────────
-- 1. Function to clean up batch and skip to closeout
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION skip_post_closeout_workflow(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- ────────────────────────────────────────────────────────────
-- 2. Function to clean up specific batch by name/month
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION skip_workflow_by_batch_name(
  p_batch_name TEXT, 
  p_batch_month DATE
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Execute the cleanup for the specific batch
-- ────────────────────────────────────────────────────────────

-- Clean up the "batchess · April 2028" batch
SELECT skip_workflow_by_batch_name('batchess', '2028-04-01'::DATE);

-- Grant permissions
GRANT EXECUTE ON FUNCTION skip_post_closeout_workflow(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION skip_workflow_by_batch_name(TEXT, DATE) TO authenticated, anon, service_role;

-- Add comments
COMMENT ON FUNCTION skip_post_closeout_workflow(UUID) IS 
  'Skip post-closeout workflow: clears batch_workflow_steps, deletes $0 memos, resets Cardinal flags on return_batches (FCR-55).';
COMMENT ON FUNCTION skip_workflow_by_batch_name(TEXT, DATE) IS 
  'Skip post-closeout workflow by batch name and month (FCR-55).';