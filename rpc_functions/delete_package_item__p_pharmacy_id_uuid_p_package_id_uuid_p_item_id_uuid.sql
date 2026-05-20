-- Function : delete_package_item
-- Arguments: p_pharmacy_id uuid, p_package_id uuid, p_item_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_package_item(p_pharmacy_id uuid, p_package_id uuid, p_item_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_package_item(p_pharmacy_id uuid, p_package_id uuid, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
