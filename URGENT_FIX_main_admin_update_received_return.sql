-- ============================================================
-- URGENT FIX: Allow Main Admin to update classification fields on "received" returns
-- ============================================================
-- This fixes the issue where Main Admin cannot update returnStatus on received returns
-- 
-- TO APPLY THIS FIX:
-- 1. Go to https://supabase.com/dashboard/project/zggtgjbokgfsbenazzpx/sql/new
-- 2. Copy and paste this entire SQL block
-- 3. Click "Run" to execute
-- ============================================================

-- Update the RPC function to explicitly allow classification updates for main_admin
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
  v_caller_role TEXT;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  v_is_locked := is_return_transaction_locked(v_txn.status);

  -- Get current user's role/type from JWT claims
  BEGIN
    v_caller_role := current_setting('request.jwt.claims', true)::json->>'type';
  EXCEPTION
    WHEN OTHERS THEN
      v_caller_role := 'unknown';
  END;

  -- LOCKED: For main_admin and admin roles, allow classification fields even on locked returns
  IF v_is_locked THEN
    -- Check if trying to update core immutable fields
    IF (p_updates ? 'ndc') OR (p_updates ? 'ndc10')
       OR (p_updates ? 'proprietaryName') OR (p_updates ? 'genericName')
       OR (p_updates ? 'manufacturer') OR (p_updates ? 'packageDescription')
       OR (p_updates ? 'dosageForm') OR (p_updates ? 'strength') OR (p_updates ? 'route')
       OR (p_updates ? 'lotNumber') OR (p_updates ? 'serialNumber')
       OR (p_updates ? 'expirationDate') OR (p_updates ? 'standardPrice')
       OR (p_updates ? 'quantity') OR (p_updates ? 'fullPackageSize')
       OR (p_updates ? 'isPartial') OR (p_updates ? 'partialPercentage')
       OR (p_updates ? 'deaSchedule') OR (p_updates ? 'deaForm222Required') THEN
      
      -- Allow main_admin and admin to update core fields on "received" status (for verification workflow)
      IF v_txn.status = 'received' AND v_caller_role IN ('main_admin', 'admin') THEN
        -- Allow these updates for main_admin on received returns
        NULL; -- Continue with update
      ELSE
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot update core item data on a "%s" return. Only classification fields (destination, return status, memo) can be updated.', v_txn.status));
      END IF;
    END IF;

    -- For locked returns, update only allowed fields based on role
    IF v_txn.status = 'received' AND v_caller_role IN ('main_admin', 'admin') THEN
      -- Main admin can update more fields on received returns for verification
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
        bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),          bmp_status),
        -- Allow core field updates for main_admin on received returns
        ndc                   = CASE WHEN p_updates ? 'ndc' THEN NULLIF(TRIM(p_updates->>'ndc'), '') ELSE ndc END,
        ndc_10                = CASE WHEN p_updates ? 'ndc10' THEN NULLIF(TRIM(p_updates->>'ndc10'), '') ELSE ndc_10 END,
        proprietary_name      = CASE WHEN p_updates ? 'proprietaryName' THEN NULLIF(TRIM(p_updates->>'proprietaryName'), '') ELSE proprietary_name END,
        generic_name          = CASE WHEN p_updates ? 'genericName' THEN NULLIF(TRIM(p_updates->>'genericName'), '') ELSE generic_name END,
        manufacturer          = CASE WHEN p_updates ? 'manufacturer' THEN NULLIF(TRIM(p_updates->>'manufacturer'), '') ELSE manufacturer END,
        dosage_form           = CASE WHEN p_updates ? 'dosageForm' THEN NULLIF(TRIM(p_updates->>'dosageForm'), '') ELSE dosage_form END,
        strength              = CASE WHEN p_updates ? 'strength' THEN NULLIF(TRIM(p_updates->>'strength'), '') ELSE strength END,
        lot_number            = CASE WHEN p_updates ? 'lotNumber' THEN NULLIF(TRIM(p_updates->>'lotNumber'), '') ELSE lot_number END,
        expiration_date       = CASE WHEN p_updates ? 'expirationDate' THEN (p_updates->>'expirationDate')::date ELSE expiration_date END,
        quantity              = CASE WHEN p_updates ? 'quantity' THEN (p_updates->>'quantity')::int ELSE quantity END,
        is_partial            = CASE WHEN p_updates ? 'isPartial' THEN (p_updates->>'isPartial')::boolean ELSE is_partial END,
        partial_percentage    = CASE WHEN p_updates ? 'partialPercentage' THEN (p_updates->>'partialPercentage')::decimal ELSE partial_percentage END,
        dea_schedule          = CASE WHEN p_updates ? 'deaSchedule' THEN NULLIF(TRIM(p_updates->>'deaSchedule'), '') ELSE dea_schedule END
      WHERE id = p_item_id
      RETURNING * INTO v_item;
    ELSE
      -- For other locked statuses, only allow classification fields
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
    END IF;
  ELSE
    -- NOT LOCKED: Allow all updates
    -- Get new status for auto-destination logic
    v_new_status := TRIM(p_updates->>'returnStatus');
    
    -- Auto-assign destination for returnable items if not provided
    IF v_new_status = 'returnable' AND NOT (p_updates ? 'destination') THEN
      SELECT destination INTO v_auto_destination
      FROM manufacturer_policies
      WHERE labeler_id = SUBSTRING(v_item.ndc FROM 1 FOR POSITION('-' IN v_item.ndc) - 1)
      LIMIT 1;
    END IF;

    -- Apply all updates (unlocked return)
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
      expiration_date       = CASE WHEN p_updates ? 'expirationDate' THEN (p_updates->>'expirationDate')::date ELSE expiration_date END,
      standard_price        = CASE WHEN p_updates ? 'standardPrice' THEN (p_updates->>'standardPrice')::decimal ELSE standard_price END,
      quantity              = CASE WHEN p_updates ? 'quantity' THEN (p_updates->>'quantity')::int ELSE quantity END,
      full_package_size     = CASE WHEN p_updates ? 'fullPackageSize' THEN (p_updates->>'fullPackageSize')::int ELSE full_package_size END,
      is_partial            = CASE WHEN p_updates ? 'isPartial' THEN (p_updates->>'isPartial')::boolean ELSE is_partial END,
      partial_percentage    = CASE WHEN p_updates ? 'partialPercentage' THEN (p_updates->>'partialPercentage')::decimal ELSE partial_percentage END,
      return_status         = COALESCE(NULLIF(TRIM(p_updates->>'returnStatus'), ''), return_status),
      non_returnable_reason = CASE WHEN p_updates ? 'nonReturnableReason' THEN NULLIF(TRIM(p_updates->>'nonReturnableReason'), '') ELSE non_returnable_reason END,
      return_reason         = COALESCE(NULLIF(TRIM(p_updates->>'returnReason'), ''),       return_reason),
      destination           = COALESCE(v_auto_destination, CASE WHEN p_updates ? 'destination' THEN NULLIF(TRIM(p_updates->>'destination'), '') ELSE destination END),
      memo                  = COALESCE(NULLIF(TRIM(p_updates->>'memo'), ''),               memo),
      dea_schedule          = COALESCE(NULLIF(TRIM(p_updates->>'deaSchedule'), ''),         dea_schedule),
      dea_form_222_required = CASE WHEN p_updates ? 'deaForm222Required' THEN (p_updates->>'deaForm222Required')::boolean ELSE dea_form_222_required END,
      co_status             = COALESCE(NULLIF(TRIM(p_updates->>'coStatus'), ''),           co_status),
      bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),          bmp_status)
    WHERE id = p_item_id
    RETURNING * INTO v_item;
  END IF;

  -- Update return transaction totals
  UPDATE return_transactions SET
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
      WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
      WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
    ),
    updated_at = NOW()
  WHERE id = v_item.transaction_id;

  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_return_transaction_item(UUID, JSONB) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION update_return_transaction_item(UUID, JSONB) IS 
  'Updates return transaction item with role-based locking. Main admin can update classification fields on received returns for verification workflow.';

-- ============================================================
-- VERIFICATION QUERY (Optional - run after the function fix)
-- ============================================================
-- Test updating an item on a received return:
-- SELECT update_return_transaction_item('b4eb0b17-c3f6-46b0-a170-a19503f39451', '{"returnStatus": "returnable"}'::jsonb);
-- ============================================================