-- ============================================================
-- FCR-32: Batch Management — Delete Batches & Unassign Returns
-- ============================================================
-- Adds missing batch management operations:
--   1. RPC: delete_batch — Delete a batch (only if open and no debit memos)
--   2. RPC: unassign_returns_from_batch — Remove returns from a batch
--   3. RPC: unassign_single_return — Remove one return from its batch
--   4. Enhanced validation and safety checks
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. RPC: delete_batch
--    Deletes a batch if it's safe to do so
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_batch(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch return_batches;
  v_return_count INTEGER;
  v_memo_count INTEGER;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  -- Only allow deletion of open batches
  IF v_batch.status != 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete batch with status "%s". Only open batches can be deleted.', v_batch.status));
  END IF;

  -- Check if batch has any debit memos (shouldn't happen for open batches, but safety check)
  SELECT COUNT(*) INTO v_memo_count FROM debit_memos WHERE batch_id = p_batch_id;
  IF v_memo_count > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete batch with %s existing debit memo(s). Close-out process has begun.', v_memo_count));
  END IF;

  -- Count assigned returns
  SELECT COUNT(*) INTO v_return_count FROM return_transactions WHERE batch_id = p_batch_id;

  -- Unassign all returns from this batch first
  UPDATE return_transactions 
  SET batch_id = NULL 
  WHERE batch_id = p_batch_id;

  -- Delete the batch
  DELETE FROM return_batches WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'error', false,
    'message', format('Batch "%s" deleted successfully. %s return(s) unassigned.', v_batch.batch_name, v_return_count),
    'deleted_batch', _batch_to_json(v_batch),
    'unassigned_returns', v_return_count
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. RPC: unassign_returns_from_batch
--    Remove multiple returns from a batch
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION unassign_returns_from_batch(
  p_batch_id UUID,
  p_transaction_ids UUID[]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch return_batches;
  v_txn return_transactions;
  v_unassigned_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_tid UUID;
  v_new_total INTEGER;
  v_new_value DECIMAL(12,2);
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  -- Only allow unassigning from open batches
  IF v_batch.status != 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot unassign returns from batch with status "%s". Only open batches can be modified.', v_batch.status));
  END IF;

  FOREACH v_tid IN ARRAY p_transaction_ids LOOP
    SELECT * INTO v_txn FROM return_transactions WHERE id = v_tid;
    
    -- Skip if return doesn't exist
    IF NOT FOUND THEN 
      v_skipped_count := v_skipped_count + 1;
      CONTINUE; 
    END IF;

    -- Skip if return is not assigned to this batch
    IF v_txn.batch_id != p_batch_id THEN 
      v_skipped_count := v_skipped_count + 1;
      CONTINUE; 
    END IF;

    -- Unassign the return
    UPDATE return_transactions SET batch_id = NULL WHERE id = v_tid;
    v_unassigned_count := v_unassigned_count + 1;
  END LOOP;

  -- Recalculate batch totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_returnable_value + total_non_returnable_value), 0)
  INTO v_new_total, v_new_value
  FROM return_transactions 
  WHERE batch_id = p_batch_id;

  UPDATE return_batches SET
    total_returns = v_new_total,
    total_value = v_new_value
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error', false,
    'message', format('Unassigned %s return(s) from batch. Skipped %s.', v_unassigned_count, v_skipped_count),
    'batch', _batch_to_json(v_batch),
    'unassigned_count', v_unassigned_count,
    'skipped_count', v_skipped_count
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. RPC: unassign_single_return
--    Remove one return from its current batch (convenience function)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION unassign_single_return(p_transaction_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn return_transactions;
  v_batch return_batches;
  v_new_total INTEGER;
  v_new_value DECIMAL(12,2);
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  -- Check if return is assigned to a batch
  IF v_txn.batch_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Return is not assigned to any batch');
  END IF;

  -- Get the batch
  SELECT * INTO v_batch FROM return_batches WHERE id = v_txn.batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  -- Only allow unassigning from open batches
  IF v_batch.status != 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot unassign return from batch with status "%s". Only open batches can be modified.', v_batch.status));
  END IF;

  -- Unassign the return
  UPDATE return_transactions SET batch_id = NULL WHERE id = p_transaction_id;

  -- Recalculate batch totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_returnable_value + total_non_returnable_value), 0)
  INTO v_new_total, v_new_value
  FROM return_transactions 
  WHERE batch_id = v_batch.id;

  UPDATE return_batches SET
    total_returns = v_new_total,
    total_value = v_new_value
  WHERE id = v_batch.id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error', false,
    'message', format('Return "%s" unassigned from batch "%s"', v_txn.license_plate, v_batch.batch_name),
    'batch', _batch_to_json(v_batch),
    'return', _rt_to_json(v_txn)
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. Enhanced get_batch to include unassign capabilities
-- ────────────────────────────────────────────────────────────
-- (The existing get_batch is fine, but we'll add a helper to check if operations are allowed)

CREATE OR REPLACE FUNCTION get_batch_permissions(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- ────────────────────────────────────────────────────────────
-- Grants
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION delete_batch TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION unassign_returns_from_batch TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION unassign_single_return TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_batch_permissions TO authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- Comments
-- ────────────────────────────────────────────────────────────
COMMENT ON FUNCTION delete_batch(UUID) IS 'Delete a batch if it is open and has no debit memos generated';
COMMENT ON FUNCTION unassign_returns_from_batch(UUID, UUID[]) IS 'Remove multiple returns from a batch assignment';
COMMENT ON FUNCTION unassign_single_return(UUID) IS 'Remove a single return from its current batch assignment';
COMMENT ON FUNCTION get_batch_permissions(UUID) IS 'Check what operations are allowed on a batch based on its current state';