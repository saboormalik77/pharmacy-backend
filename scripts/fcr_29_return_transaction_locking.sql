-- ============================================================
-- FCR-29: Return Transaction Locking After Finalization
-- ============================================================
-- This migration implements comprehensive data integrity protection
-- for return transactions after finalization. Once a return is
-- finalized (and especially after warehouse processing begins),
-- no modifications should be allowed to prevent data discrepancies.
--
-- Status Flow:
-- in_progress → completed → finalized → scanning → received → verified → closed
--                           ^--- LOCK POINT: No edits allowed after this
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Helper Function: Check if return is locked
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_return_transaction_locked(p_status TEXT)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status IN ('finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out');
$$;

-- ────────────────────────────────────────────────────────────
-- 2. Update update_return_transaction to block ALL locked states
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_return_transaction(
  p_id                        UUID,
  p_fedex_tracking            TEXT DEFAULT NULL,
  p_fedex_pickup_confirmation TEXT DEFAULT NULL,
  p_notes                     TEXT DEFAULT NULL,
  p_service_type              TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  -- Block all modifications on locked returns
  IF is_return_transaction_locked(v_row.status) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot update return transaction with status "%s". Return is locked after finalization.', v_row.status));
  END IF;

  IF p_service_type IS NOT NULL AND p_service_type NOT IN ('in_store','self_service','express') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'service_type must be one of: in_store, self_service, express');
  END IF;

  UPDATE return_transactions SET
    fedex_tracking            = COALESCE(p_fedex_tracking,            fedex_tracking),
    fedex_pickup_confirmation = COALESCE(p_fedex_pickup_confirmation, fedex_pickup_confirmation),
    notes                     = COALESCE(p_notes,                     notes),
    service_type              = COALESCE(p_service_type,              service_type)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Update update_finalize_steps to block modifications after finalization
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_finalize_steps(
  p_id    UUID,
  p_steps JSONB
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Allow finalize steps updates only for completed returns
  -- Once finalized, these steps should not be modified
  IF v_row.status != 'completed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot update finalize steps for return with status "%s". Only completed returns can have finalize steps updated.', v_row.status));
  END IF;

  UPDATE return_transactions
     SET finalize_steps = COALESCE(finalize_steps, '{}'::jsonb) || p_steps,
         updated_at     = NOW()
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'error', false,
    'data',  _rt_to_json(v_row)
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. Update update_return_transaction_item to block ALL locked states
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_return_transaction_item(p_item_id UUID, p_updates jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_txn  RECORD;
  v_price DECIMAL;
  v_qty   INTEGER;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  
  -- Block all modifications on locked returns
  IF is_return_transaction_locked(v_txn.status) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot update items on return with status "%s". Return is locked after finalization.', v_txn.status));
  END IF;

  -- Apply updates (only non-null fields from p_updates)
  UPDATE return_transaction_items SET
    ndc                   = COALESCE(NULLIF(TRIM(p_updates->>'ndc'), ''),               ndc),
    ndc_10                = COALESCE(NULLIF(TRIM(p_updates->>'ndc10'), ''),              ndc_10),
    proprietary_name      = COALESCE(NULLIF(TRIM(p_updates->>'proprietaryName'), ''),    proprietary_name),
    generic_name          = COALESCE(NULLIF(TRIM(p_updates->>'genericName'), ''),        generic_name),
    manufacturer          = COALESCE(NULLIF(TRIM(p_updates->>'manufacturer'), ''),       manufacturer),
    package_description   = COALESCE(NULLIF(TRIM(p_updates->>'packageDescription'), ''), package_description),
    dosage_form           = COALESCE(NULLIF(TRIM(p_updates->>'dosageForm'), ''),          dosage_form),
    strength              = COALESCE(NULLIF(TRIM(p_updates->>'strength'), ''),            strength),
    route                 = COALESCE(NULLIF(TRIM(p_updates->>'route'), ''),               route),
    lot_number            = COALESCE(NULLIF(TRIM(p_updates->>'lotNumber'), ''),           lot_number),
    serial_number         = COALESCE(NULLIF(TRIM(p_updates->>'serialNumber'), ''),        serial_number),
    expiration_date       = CASE WHEN p_updates ? 'expirationDate'
                                 THEN (p_updates->>'expirationDate')::date
                                 ELSE expiration_date END,
    standard_price        = CASE WHEN p_updates ? 'standardPrice'
                                 THEN (p_updates->>'standardPrice')::decimal
                                 ELSE standard_price END,
    quantity              = CASE WHEN p_updates ? 'quantity'
                                 THEN (p_updates->>'quantity')::int
                                 ELSE quantity END,
    full_package_size     = CASE WHEN p_updates ? 'fullPackageSize'
                                 THEN (p_updates->>'fullPackageSize')::int
                                 ELSE full_package_size END,
    is_partial            = CASE WHEN p_updates ? 'isPartial'
                                 THEN (p_updates->>'isPartial')::boolean
                                 ELSE is_partial END,
    partial_percentage    = CASE WHEN p_updates ? 'partialPercentage'
                                 THEN (p_updates->>'partialPercentage')::decimal
                                 ELSE partial_percentage END,
    return_status         = COALESCE(NULLIF(TRIM(p_updates->>'returnStatus'), ''),        return_status),
    notes                 = COALESCE(NULLIF(TRIM(p_updates->>'notes'), ''),               notes),
    co_status             = COALESCE(NULLIF(TRIM(p_updates->>'coStatus'), ''),            co_status),
    bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),           bmp_status),
    close_out_destination = COALESCE(NULLIF(TRIM(p_updates->>'closeOutDestination'), ''), close_out_destination),
    estimated_value       = CASE WHEN p_updates ? 'estimatedValue'
                                 THEN (p_updates->>'estimatedValue')::decimal
                                 ELSE estimated_value END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Recalculate estimated_value if price or quantity changed
  IF (p_updates ? 'standardPrice') OR (p_updates ? 'quantity') THEN
    v_price := COALESCE(v_item.standard_price, 0);
    v_qty   := COALESCE(v_item.quantity, 0);
    
    UPDATE return_transaction_items SET
      estimated_value = v_price * v_qty
    WHERE id = p_item_id
    RETURNING * INTO v_item;
  END IF;

  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. Add database-level constraints to prevent direct SQL modifications
-- ────────────────────────────────────────────────────────────

-- Trigger function to prevent updates on locked returns
CREATE OR REPLACE FUNCTION prevent_locked_return_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Allow updates during status transitions (handled by specific RPCs)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Block other updates on locked returns
  IF TG_OP = 'UPDATE' AND is_return_transaction_locked(OLD.status) THEN
    RAISE EXCEPTION 'Cannot modify return transaction with status "%". Return is locked after finalization.', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to return_transactions
DROP TRIGGER IF EXISTS prevent_locked_return_updates_trigger ON return_transactions;
CREATE TRIGGER prevent_locked_return_updates_trigger
  BEFORE UPDATE ON return_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_return_updates();

-- Trigger function to prevent item updates on locked returns
CREATE OR REPLACE FUNCTION prevent_locked_return_item_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_return_status TEXT;
BEGIN
  -- Get the return transaction status
  SELECT status INTO v_return_status 
  FROM return_transactions 
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  -- Block modifications on locked returns
  IF is_return_transaction_locked(v_return_status) THEN
    RAISE EXCEPTION 'Cannot modify items on return with status "%". Return is locked after finalization.', v_return_status;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to return_transaction_items
DROP TRIGGER IF EXISTS prevent_locked_return_item_updates_trigger ON return_transaction_items;
CREATE TRIGGER prevent_locked_return_item_updates_trigger
  BEFORE UPDATE OR DELETE ON return_transaction_items
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_return_item_updates();

-- ────────────────────────────────────────────────────────────
-- 6. Create new RPC for adding items with lock validation
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_return_transaction_item_with_validation(
  p_transaction_id UUID,
  p_item_data      JSONB
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_return_status TEXT;
  v_result JSONB;
BEGIN
  -- Check if return is locked
  SELECT status INTO v_return_status FROM return_transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;
  
  IF is_return_transaction_locked(v_return_status) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot add items to return with status "%s". Return is locked after finalization.', v_return_status));
  END IF;
  
  -- Call the existing add function
  SELECT add_return_transaction_item(p_transaction_id, p_item_data) INTO v_result;
  RETURN v_result;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 7. Create RPC for deleting items with lock validation
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_return_transaction_item_with_validation(p_item_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_return_status TEXT;
BEGIN
  -- Check if return is locked
  SELECT rt.status INTO v_return_status 
  FROM return_transaction_items rti
  JOIN return_transactions rt ON rt.id = rti.transaction_id
  WHERE rti.id = p_item_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;
  
  IF is_return_transaction_locked(v_return_status) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete items from return with status "%s". Return is locked after finalization.', v_return_status));
  END IF;
  
  -- Delete the item
  DELETE FROM return_transaction_items WHERE id = p_item_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;
  
  RETURN jsonb_build_object('error', false, 'message', 'Item deleted successfully');
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 8. Create RPC to check if return is locked (for frontend)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_return_transaction_lock_status(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
  v_is_locked BOOLEAN;
BEGIN
  SELECT status INTO v_status FROM return_transactions WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;
  
  v_is_locked := is_return_transaction_locked(v_status);
  
  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id', p_id,
      'status', v_status,
      'isLocked', v_is_locked,
      'canEdit', NOT v_is_locked,
      'lockReason', CASE 
        WHEN v_is_locked THEN 'Return is locked after finalization to prevent data discrepancies'
        ELSE null
      END
    )
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Grants
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION is_return_transaction_locked TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION add_return_transaction_item_with_validation TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_return_transaction_item_with_validation TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_return_transaction_lock_status TO authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- Comments for documentation
-- ────────────────────────────────────────────────────────────
COMMENT ON FUNCTION is_return_transaction_locked(TEXT) IS 'Checks if a return transaction status indicates the return is locked for editing';
COMMENT ON FUNCTION add_return_transaction_item_with_validation(UUID, JSONB) IS 'Adds an item to a return transaction with lock status validation';
COMMENT ON FUNCTION delete_return_transaction_item_with_validation(UUID) IS 'Deletes an item from a return transaction with lock status validation';
COMMENT ON FUNCTION check_return_transaction_lock_status(UUID) IS 'Returns the lock status of a return transaction for frontend validation';