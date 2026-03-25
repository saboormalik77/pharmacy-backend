-- ============================================================
-- FCR-31: Granular Locking — Replace Blanket Lock with Smart Permissions
-- ============================================================
-- Replaces the blanket "lock everything after finalization" approach
-- with granular field-level and role-aware controls.
--
-- Status Flow:
-- in_progress → paused → in_progress → completed → finalized → received → verified → closed_out
--
-- Principles:
--   1. After finalization: core data (items, quantities, prices) is frozen
--   2. Admin can still update classification fields (destination, return_status, memo, co_status, bmp_status)
--   3. Warehouse verification fields (verified, actual_quantity, condition_notes) are always updatable on received returns
--   4. Notes on the return transaction are always editable by admins
--   5. Add/Delete items is blocked after finalization
--   6. Status transitions are always allowed (handled by specific RPCs)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Replace the helper: now distinguishes "hard locked" vs "soft locked"
-- ────────────────────────────────────────────────────────────

-- Hard lock = no edits at all (processor perspective)
CREATE OR REPLACE FUNCTION is_return_transaction_locked(p_status TEXT)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status IN ('finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out');
$$;

-- Soft lock = admin can still update classification & notes
CREATE OR REPLACE FUNCTION is_return_transaction_hard_locked(p_status TEXT)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status IN ('closed', 'closed_out');
$$;

-- ────────────────────────────────────────────────────────────
-- 2. Replace the return_transactions trigger with granular logic
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_locked_return_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Always allow status transitions (handled by specific RPCs)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Always allow warehouse-related field updates (verified_at, verified_by, pieces_received, verified_integrity)
  -- These are set by warehouse_verify_return and warehouse_receive_return RPCs
  IF OLD.verified_at IS DISTINCT FROM NEW.verified_at
     OR OLD.verified_by IS DISTINCT FROM NEW.verified_by
     OR OLD.pieces_received IS DISTINCT FROM NEW.pieces_received
     OR OLD.verified_integrity IS DISTINCT FROM NEW.verified_integrity
     OR OLD.received_in_warehouse_date IS DISTINCT FROM NEW.received_in_warehouse_date THEN
    RETURN NEW;
  END IF;

  -- Always allow batch assignment changes
  IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
    RETURN NEW;
  END IF;

  -- Always allow notes and finalize_steps updates (admin workflow)
  IF is_return_transaction_locked(OLD.status) THEN
    -- Only allow notes and updated_at changes on locked returns
    IF OLD.fedex_tracking IS DISTINCT FROM NEW.fedex_tracking
       OR OLD.fedex_pickup_confirmation IS DISTINCT FROM NEW.fedex_pickup_confirmation
       OR OLD.service_type IS DISTINCT FROM NEW.service_type THEN
      RAISE EXCEPTION 'Cannot modify core return details (tracking, service type) on a % return. Return is locked.', OLD.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_return_updates_trigger ON return_transactions;
CREATE TRIGGER prevent_locked_return_updates_trigger
  BEFORE UPDATE ON return_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_return_updates();

-- ────────────────────────────────────────────────────────────
-- 3. Replace the item trigger with granular logic
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_locked_return_item_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_return_status TEXT;
BEGIN
  SELECT status INTO v_return_status 
  FROM return_transactions 
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  -- Not locked at all — allow everything
  IF NOT is_return_transaction_locked(v_return_status) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- DELETE is always blocked on locked returns
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete items on a % return. Return is locked.', v_return_status;
  END IF;

  -- INSERT is always blocked on locked returns
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Cannot add items to a % return. Return is locked.', v_return_status;
  END IF;

  -- UPDATE: allow specific fields, block others
  -- Always allow warehouse verification fields
  -- Always allow admin classification fields (destination, return_status, memo, co_status, bmp_status)
  -- Block core data fields (ndc, quantity, price, lot, expiration, etc.)

  -- Check if core immutable fields are being changed
  IF OLD.ndc IS DISTINCT FROM NEW.ndc
     OR OLD.ndc_10 IS DISTINCT FROM NEW.ndc_10
     OR OLD.proprietary_name IS DISTINCT FROM NEW.proprietary_name
     OR OLD.generic_name IS DISTINCT FROM NEW.generic_name
     OR OLD.manufacturer IS DISTINCT FROM NEW.manufacturer
     OR OLD.package_description IS DISTINCT FROM NEW.package_description
     OR OLD.dosage_form IS DISTINCT FROM NEW.dosage_form
     OR OLD.strength IS DISTINCT FROM NEW.strength
     OR OLD.route IS DISTINCT FROM NEW.route
     OR OLD.lot_number IS DISTINCT FROM NEW.lot_number
     OR OLD.serial_number IS DISTINCT FROM NEW.serial_number
     OR OLD.expiration_date IS DISTINCT FROM NEW.expiration_date
     OR OLD.standard_price IS DISTINCT FROM NEW.standard_price
     OR OLD.quantity IS DISTINCT FROM NEW.quantity
     OR OLD.full_package_size IS DISTINCT FROM NEW.full_package_size
     OR OLD.is_partial IS DISTINCT FROM NEW.is_partial
     OR OLD.partial_percentage IS DISTINCT FROM NEW.partial_percentage
     OR OLD.estimated_value IS DISTINCT FROM NEW.estimated_value
     OR OLD.dea_schedule IS DISTINCT FROM NEW.dea_schedule
     OR OLD.dea_form_222_required IS DISTINCT FROM NEW.dea_form_222_required
     OR OLD.product_type IS DISTINCT FROM NEW.product_type THEN
    RAISE EXCEPTION 'Cannot modify core item data (NDC, quantity, price, lot, expiration) on a % return. Return is locked.', v_return_status;
  END IF;

  -- If we get here, only allowed fields are changing:
  -- destination, return_status, non_returnable_reason, return_reason, 
  -- memo, co_status, bmp_status, wine_cellar_id, scan_source,
  -- verified, actual_quantity, condition_notes
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_return_item_updates_trigger ON return_transaction_items;
CREATE TRIGGER prevent_locked_return_item_updates_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON return_transaction_items
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_return_item_updates();

-- ────────────────────────────────────────────────────────────
-- 4. Update update_return_transaction — allow notes on locked returns
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

  -- On locked returns, only allow notes update
  IF is_return_transaction_locked(v_row.status) THEN
    IF p_fedex_tracking IS NOT NULL OR p_fedex_pickup_confirmation IS NOT NULL OR p_service_type IS NOT NULL THEN
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Cannot update tracking/service type on a "%s" return. Only notes can be updated.', v_row.status));
    END IF;
    
    -- Only update notes
    IF p_notes IS NOT NULL THEN
      UPDATE return_transactions SET
        notes = p_notes
      WHERE id = p_id
      RETURNING * INTO v_row;
    END IF;
    
    RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
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
-- 5. Update update_return_transaction_item — allow classification fields on locked returns
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_return_transaction_item(p_item_id UUID, p_updates jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_txn  RECORD;
  v_price DECIMAL;
  v_qty   INTEGER;
  v_new_status TEXT;
  v_auto_destination TEXT;
  v_is_locked BOOLEAN;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  v_is_locked := is_return_transaction_locked(v_txn.status);

  -- On locked returns, only allow classification fields
  IF v_is_locked THEN
    -- Check if any core fields are being updated (blocked)
    IF (p_updates ? 'ndc') OR (p_updates ? 'ndc10')
       OR (p_updates ? 'proprietaryName') OR (p_updates ? 'genericName')
       OR (p_updates ? 'manufacturer') OR (p_updates ? 'packageDescription')
       OR (p_updates ? 'dosageForm') OR (p_updates ? 'strength') OR (p_updates ? 'route')
       OR (p_updates ? 'lotNumber') OR (p_updates ? 'serialNumber')
       OR (p_updates ? 'expirationDate') OR (p_updates ? 'standardPrice')
       OR (p_updates ? 'quantity') OR (p_updates ? 'fullPackageSize')
       OR (p_updates ? 'isPartial') OR (p_updates ? 'partialPercentage')
       OR (p_updates ? 'deaSchedule') OR (p_updates ? 'deaForm222Required') THEN
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Cannot update core item data on a "%s" return. Only classification fields (destination, return status, memo, co_status, bmp_status) can be updated.', v_txn.status));
    END IF;

    -- Only update classification fields
    UPDATE return_transaction_items SET
      return_status         = COALESCE(NULLIF(TRIM(p_updates->>'returnStatus'), ''),       return_status),
      non_returnable_reason = CASE WHEN p_updates ? 'nonReturnableReason'
                                   THEN NULLIF(TRIM(p_updates->>'nonReturnableReason'), '')
                                   ELSE non_returnable_reason END,
      return_reason         = COALESCE(NULLIF(TRIM(p_updates->>'returnReason'), ''),       return_reason),
      destination           = CASE WHEN p_updates ? 'destination'
                                   THEN NULLIF(TRIM(p_updates->>'destination'), '')
                                   ELSE destination END,
      memo                  = COALESCE(NULLIF(TRIM(p_updates->>'memo'), ''),               memo),
      co_status             = COALESCE(NULLIF(TRIM(p_updates->>'coStatus'), ''),           co_status),
      bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),          bmp_status)
    WHERE id = p_item_id
    RETURNING * INTO v_item;

    -- Recalculate totals on the transaction
    UPDATE return_transactions SET
      total_returnable_value = (
        SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
        WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
      ),
      total_non_returnable_value = (
        SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
        WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
      )
    WHERE id = v_item.transaction_id;

    RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
  END IF;

  -- Not locked — full update allowed
  -- Auto-assign destination if changing to returnable
  v_new_status := p_updates->>'returnStatus';
  IF v_new_status = 'returnable' 
     AND NOT (p_updates ? 'destination')
     AND (v_item.destination IS NULL OR TRIM(v_item.destination) = '') THEN
    v_auto_destination := get_destination_for_ndc(v_item.ndc);
    IF v_auto_destination IS NOT NULL THEN
      p_updates := p_updates || jsonb_build_object('destination', v_auto_destination);
    END IF;
  END IF;

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
    return_status         = COALESCE(NULLIF(TRIM(p_updates->>'returnStatus'), ''),       return_status),
    non_returnable_reason = CASE WHEN p_updates ? 'nonReturnableReason'
                                 THEN NULLIF(TRIM(p_updates->>'nonReturnableReason'), '')
                                 ELSE non_returnable_reason END,
    return_reason         = COALESCE(NULLIF(TRIM(p_updates->>'returnReason'), ''),       return_reason),
    destination           = CASE WHEN p_updates ? 'destination'
                                 THEN NULLIF(TRIM(p_updates->>'destination'), '')
                                 ELSE destination END,
    dea_schedule          = COALESCE(NULLIF(TRIM(p_updates->>'deaSchedule'), ''),        dea_schedule),
    dea_form_222_required = CASE WHEN p_updates ? 'deaForm222Required'
                                 THEN (p_updates->>'deaForm222Required')::boolean
                                 ELSE dea_form_222_required END,
    memo                  = COALESCE(NULLIF(TRIM(p_updates->>'memo'), ''),               memo),
    co_status             = COALESCE(NULLIF(TRIM(p_updates->>'coStatus'), ''),           co_status),
    bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),          bmp_status)
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Recalculate estimated_value considering partials
  v_price := COALESCE(v_item.standard_price, 0);
  v_qty   := COALESCE(v_item.quantity, 1);
  
  UPDATE return_transaction_items 
  SET estimated_value = CASE 
    WHEN is_partial = true AND partial_percentage IS NOT NULL 
    THEN v_price * v_qty * (partial_percentage / 100)
    ELSE v_price * v_qty 
  END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Update transaction totals
  UPDATE return_transactions SET
    total_items = (SELECT COUNT(*) FROM return_transaction_items WHERE transaction_id = v_item.transaction_id),
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
    )
  WHERE id = v_item.transaction_id;

  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 6. Updated check_return_transaction_lock_status — richer response
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
      'canEditClassification', true,
      'canEditNotes', true,
      'canEditCoreData', NOT v_is_locked,
      'canAddDeleteItems', NOT v_is_locked,
      'lockReason', CASE 
        WHEN v_is_locked THEN format('Return is in "%s" status. Core data is locked, but classification fields and notes can still be updated by admins.', v_status)
        ELSE null
      END
    )
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Grants
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION is_return_transaction_hard_locked TO authenticated, anon, service_role;