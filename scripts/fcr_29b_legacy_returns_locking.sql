-- ============================================================
-- FCR-29B: Legacy Returns System Locking Protection
-- ============================================================
-- This migration extends the return transaction locking system
-- to also protect the legacy "returns" table used by the 
-- processor interface. This ensures consistent protection
-- across both the FCR system and legacy returns system.
--
-- The legacy system uses different status values:
-- draft → ready_to_ship → in_transit → processing → completed → cancelled
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Helper Function: Check if legacy return is locked
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_legacy_return_locked(p_status TEXT)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  -- Lock returns that are in_transit, processing, or completed
  -- These correspond to returns that have been shipped or are being processed
  SELECT p_status IN ('in_transit', 'processing', 'completed');
$$;

-- ────────────────────────────────────────────────────────────
-- 2. Add database triggers to prevent direct modifications
-- ────────────────────────────────────────────────────────────

-- Trigger function to prevent updates on locked legacy returns
CREATE OR REPLACE FUNCTION prevent_locked_legacy_return_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Allow status transitions (handled by specific logic)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Block other updates on locked returns
  IF TG_OP = 'UPDATE' AND is_legacy_return_locked(OLD.status) THEN
    RAISE EXCEPTION 'Cannot modify return with status "%". Return is locked after shipment.', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to returns table (if it exists)
DO $$
BEGIN
  -- Check if returns table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'returns') THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS prevent_locked_legacy_return_updates_trigger ON returns;
    
    -- Create new trigger
    CREATE TRIGGER prevent_locked_legacy_return_updates_trigger
      BEFORE UPDATE ON returns
      FOR EACH ROW EXECUTE FUNCTION prevent_locked_legacy_return_updates();
      
    RAISE NOTICE 'Applied locking trigger to legacy returns table';
  ELSE
    RAISE NOTICE 'Legacy returns table not found - skipping trigger creation';
  END IF;
END
$$;

-- Trigger function to prevent item updates on locked legacy returns
CREATE OR REPLACE FUNCTION prevent_locked_legacy_return_item_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_return_status TEXT;
BEGIN
  -- Get the return status
  SELECT status INTO v_return_status 
  FROM returns 
  WHERE id = COALESCE(NEW.return_id, OLD.return_id);
  
  -- Block modifications on locked returns
  IF is_legacy_return_locked(v_return_status) THEN
    RAISE EXCEPTION 'Cannot modify items on return with status "%". Return is locked after shipment.', v_return_status;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to return_items table (if it exists)
DO $$
BEGIN
  -- Check if return_items table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'return_items') THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS prevent_locked_legacy_return_item_updates_trigger ON return_items;
    
    -- Create new trigger
    CREATE TRIGGER prevent_locked_legacy_return_item_updates_trigger
      BEFORE UPDATE OR DELETE ON return_items
      FOR EACH ROW EXECUTE FUNCTION prevent_locked_legacy_return_item_updates();
      
    RAISE NOTICE 'Applied locking trigger to legacy return_items table';
  ELSE
    RAISE NOTICE 'Legacy return_items table not found - skipping trigger creation';
  END IF;
END
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Create RPC function to check legacy return lock status
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_legacy_return_lock_status(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
  v_is_locked BOOLEAN;
BEGIN
  -- Check if returns table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'returns') THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Legacy returns system not available');
  END IF;
  
  -- Get return status
  EXECUTE 'SELECT status FROM returns WHERE id = $1' INTO v_status USING p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found');
  END IF;
  
  v_is_locked := is_legacy_return_locked(v_status);
  
  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id', p_id,
      'status', v_status,
      'isLocked', v_is_locked,
      'canEdit', NOT v_is_locked,
      'lockReason', CASE 
        WHEN v_is_locked THEN 'Return is locked after shipment to prevent data discrepancies'
        ELSE null
      END
    )
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. Create validation functions for legacy returns service
-- ────────────────────────────────────────────────────────────

-- Function to validate legacy return updates
CREATE OR REPLACE FUNCTION validate_legacy_return_update(p_id UUID, p_updates JSONB)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
  v_is_locked BOOLEAN;
BEGIN
  -- Check if returns table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'returns') THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Legacy returns system not available');
  END IF;
  
  -- Get current status
  EXECUTE 'SELECT status FROM returns WHERE id = $1' INTO v_status USING p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found');
  END IF;
  
  v_is_locked := is_legacy_return_locked(v_status);
  
  -- If locked, only allow status changes to cancelled (for emergency cancellation)
  IF v_is_locked THEN
    -- Check if this is just a status change to cancelled
    IF p_updates ? 'status' AND (p_updates->>'status') = 'cancelled' THEN
      -- Allow cancellation
      RETURN jsonb_build_object('error', false, 'message', 'Cancellation allowed');
    ELSE
      -- Block other modifications
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Cannot modify return with status "%s". Return is locked after shipment.', v_status));
    END IF;
  END IF;
  
  -- Not locked, allow modification
  RETURN jsonb_build_object('error', false, 'message', 'Modification allowed');
END;
$$;

-- Function to validate legacy return deletion
CREATE OR REPLACE FUNCTION validate_legacy_return_deletion(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
  v_is_locked BOOLEAN;
BEGIN
  -- Check if returns table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'returns') THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Legacy returns system not available');
  END IF;
  
  -- Get current status
  EXECUTE 'SELECT status FROM returns WHERE id = $1' INTO v_status USING p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found');
  END IF;
  
  v_is_locked := is_legacy_return_locked(v_status);
  
  IF v_is_locked THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete return with status "%s". Return is locked after shipment.', v_status));
  END IF;
  
  RETURN jsonb_build_object('error', false, 'message', 'Deletion allowed');
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Grants
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION is_legacy_return_locked TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_legacy_return_lock_status TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION validate_legacy_return_update TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION validate_legacy_return_deletion TO authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- Comments for documentation
-- ────────────────────────────────────────────────────────────
COMMENT ON FUNCTION is_legacy_return_locked(TEXT) IS 'Checks if a legacy return status indicates the return is locked for editing';
COMMENT ON FUNCTION check_legacy_return_lock_status(UUID) IS 'Returns the lock status of a legacy return for frontend validation';
COMMENT ON FUNCTION validate_legacy_return_update(UUID, JSONB) IS 'Validates if a legacy return can be updated based on its lock status';
COMMENT ON FUNCTION validate_legacy_return_deletion(UUID) IS 'Validates if a legacy return can be deleted based on its lock status';

-- ────────────────────────────────────────────────────────────
-- Summary
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Legacy Returns Locking Protection Applied ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Protected Status Flow:';
  RAISE NOTICE '  draft → ready_to_ship → [LOCKED] in_transit → processing → completed';
  RAISE NOTICE '                                    ^--- Lock Point';
  RAISE NOTICE '';
  RAISE NOTICE 'Locked Operations:';
  RAISE NOTICE '  ❌ Edit return details (except cancellation)';
  RAISE NOTICE '  ❌ Add/edit/delete return items';
  RAISE NOTICE '  ❌ Delete return';
  RAISE NOTICE '';
  RAISE NOTICE 'Allowed Operations:';
  RAISE NOTICE '  ✅ View return details';
  RAISE NOTICE '  ✅ Cancel return (emergency only)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update legacy returns service to use validation functions';
  RAISE NOTICE '  2. Update processor frontend to check lock status';
  RAISE NOTICE '  3. Test with returns in different statuses';
  RAISE NOTICE '';
END
$$;