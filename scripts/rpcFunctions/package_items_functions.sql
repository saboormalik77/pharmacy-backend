-- ============================================================
-- Package Items Management RPC Functions
-- Handles update and delete operations for custom package items
-- ============================================================

-- ============================================================
-- 1. UPDATE PACKAGE ITEM
-- Updates a single item in a custom package
-- Only works for non-delivered packages (status = false)
-- ============================================================

CREATE OR REPLACE FUNCTION update_package_item(
  p_pharmacy_id UUID,
  p_package_id UUID,
  p_item_id UUID,
  p_ndc TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_full INTEGER DEFAULT NULL,
  p_partial INTEGER DEFAULT NULL,
  p_price_per_unit NUMERIC DEFAULT NULL,
  p_total_value NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_package RECORD;
  v_item RECORD;
  v_updated_item JSONB;
  v_new_total_items INTEGER;
  v_new_total_value NUMERIC;
  v_fee_rate NUMERIC;
  v_fee_amount NUMERIC;
  v_net_value NUMERIC;
BEGIN
  -- Check if package exists and belongs to pharmacy
  SELECT * INTO v_package
  FROM custom_packages
  WHERE id = p_package_id AND pharmacy_id = p_pharmacy_id;
  
  IF v_package IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Package not found or you do not have permission to update it'
    );
  END IF;
  
  -- Check if package is not delivered
  IF v_package.status = true THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cannot update items in a delivered package'
    );
  END IF;
  
  -- Check if item exists in the package
  SELECT * INTO v_item
  FROM custom_package_items
  WHERE id = p_item_id AND package_id = p_package_id;
  
  IF v_item IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Item not found in this package'
    );
  END IF;
  
  -- Validate full and partial if provided
  IF p_full IS NOT NULL AND p_full < 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Full units cannot be negative');
  END IF;
  
  IF p_partial IS NOT NULL AND p_partial < 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Partial units cannot be negative');
  END IF;
  
  -- Check that at least one of full or partial is > 0 after update
  IF (COALESCE(p_full, v_item.full) = 0 AND COALESCE(p_partial, v_item.partial) = 0) THEN
    RETURN jsonb_build_object('error', true, 'message', 'At least one of full or partial must be greater than 0');
  END IF;
  
  -- Validate price and value
  IF p_price_per_unit IS NOT NULL AND p_price_per_unit < 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Price per unit cannot be negative');
  END IF;
  
  IF p_total_value IS NOT NULL AND p_total_value < 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Total value cannot be negative');
  END IF;
  
  -- Update the item
  UPDATE custom_package_items
  SET
    ndc = COALESCE(p_ndc, ndc),
    product_name = COALESCE(p_product_name, product_name),
    "full" = COALESCE(p_full, "full"),
    "partial" = COALESCE(p_partial, "partial"),
    price_per_unit = COALESCE(p_price_per_unit, price_per_unit),
    total_value = COALESCE(p_total_value, total_value)
  WHERE id = p_item_id;
  
  -- Recalculate package totals
  SELECT 
    COALESCE(SUM("full" + "partial"), 0)::INTEGER,
    COALESCE(SUM(total_value), 0)::NUMERIC
  INTO v_new_total_items, v_new_total_value
  FROM custom_package_items
  WHERE package_id = p_package_id;
  
  -- Calculate fee if fee_rate exists
  v_fee_rate := COALESCE(v_package.fee_rate, 0);
  IF v_fee_rate > 0 THEN
    v_fee_amount := ROUND(v_new_total_value * v_fee_rate / 100, 2);
    v_net_value := v_new_total_value - v_fee_amount;
  ELSE
    v_fee_amount := 0;
    v_net_value := v_new_total_value;
  END IF;
  
  -- Update package totals
  UPDATE custom_packages
  SET
    total_items = v_new_total_items,
    total_estimated_value = ROUND(v_new_total_value, 2),
    fee_amount = v_fee_amount,
    net_estimated_value = ROUND(v_net_value, 2),
    updated_at = NOW()
  WHERE id = p_package_id;
  
  -- Fetch updated item
  SELECT jsonb_build_object(
    'id', i.id,
    'ndc', i.ndc,
    'productId', i.product_id,
    'productName', i.product_name,
    'full', i."full",
    'partial', i."partial",
    'pricePerUnit', i.price_per_unit,
    'totalValue', i.total_value
  )
  INTO v_updated_item
  FROM custom_package_items i
  WHERE i.id = p_item_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Item updated successfully',
    'item', v_updated_item,
    'packageTotals', jsonb_build_object(
      'totalItems', v_new_total_items,
      'totalEstimatedValue', ROUND(v_new_total_value, 2),
      'feeAmount', v_fee_amount,
      'netEstimatedValue', ROUND(v_net_value, 2)
    )
  );
END;
$$;

-- ============================================================
-- 2. DELETE PACKAGE ITEM
-- Deletes a single item from a custom package
-- Only works for non-delivered packages (status = false)
-- Cannot delete if it's the last item in the package
-- ============================================================

CREATE OR REPLACE FUNCTION delete_package_item(
  p_pharmacy_id UUID,
  p_package_id UUID,
  p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_package RECORD;
  v_item RECORD;
  v_item_count INTEGER;
  v_new_total_items INTEGER;
  v_new_total_value NUMERIC;
  v_fee_rate NUMERIC;
  v_fee_amount NUMERIC;
  v_net_value NUMERIC;
  v_deleted_item JSONB;
BEGIN
  -- Check if package exists and belongs to pharmacy
  SELECT * INTO v_package
  FROM custom_packages
  WHERE id = p_package_id AND pharmacy_id = p_pharmacy_id;
  
  IF v_package IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Package not found or you do not have permission to update it'
    );
  END IF;
  
  -- Check if package is not delivered
  IF v_package.status = true THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cannot delete items from a delivered package'
    );
  END IF;
  
  -- Check if item exists in the package
  SELECT * INTO v_item
  FROM custom_package_items
  WHERE id = p_item_id AND package_id = p_package_id;
  
  IF v_item IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Item not found in this package'
    );
  END IF;
  
  -- Check item count - cannot delete last item
  SELECT COUNT(*)::INTEGER INTO v_item_count
  FROM custom_package_items
  WHERE package_id = p_package_id;
  
  IF v_item_count <= 1 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cannot delete the last item. Delete the entire package instead.'
    );
  END IF;
  
  -- Store item info before deletion
  SELECT jsonb_build_object(
    'id', i.id,
    'ndc', i.ndc,
    'productId', i.product_id,
    'productName', i.product_name,
    'full', i."full",
    'partial', i."partial",
    'pricePerUnit', i.price_per_unit,
    'totalValue', i.total_value
  )
  INTO v_deleted_item
  FROM custom_package_items i
  WHERE i.id = p_item_id;
  
  -- Delete the item
  DELETE FROM custom_package_items WHERE id = p_item_id;
  
  -- Recalculate package totals
  SELECT 
    COALESCE(SUM("full" + "partial"), 0)::INTEGER,
    COALESCE(SUM(total_value), 0)::NUMERIC
  INTO v_new_total_items, v_new_total_value
  FROM custom_package_items
  WHERE package_id = p_package_id;
  
  -- Calculate fee if fee_rate exists
  v_fee_rate := COALESCE(v_package.fee_rate, 0);
  IF v_fee_rate > 0 THEN
    v_fee_amount := ROUND(v_new_total_value * v_fee_rate / 100, 2);
    v_net_value := v_new_total_value - v_fee_amount;
  ELSE
    v_fee_amount := 0;
    v_net_value := v_new_total_value;
  END IF;
  
  -- Update package totals
  UPDATE custom_packages
  SET
    total_items = v_new_total_items,
    total_estimated_value = ROUND(v_new_total_value, 2),
    fee_amount = v_fee_amount,
    net_estimated_value = ROUND(v_net_value, 2),
    updated_at = NOW()
  WHERE id = p_package_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Item deleted successfully',
    'deletedItem', v_deleted_item,
    'packageTotals', jsonb_build_object(
      'totalItems', v_new_total_items,
      'totalEstimatedValue', ROUND(v_new_total_value, 2),
      'feeAmount', v_fee_amount,
      'netEstimatedValue', ROUND(v_net_value, 2)
    )
  );
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION update_package_item TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_package_item TO authenticated, anon, service_role;

