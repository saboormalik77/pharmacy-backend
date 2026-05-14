-- Function : update_package_item
-- Arguments: p_pharmacy_id uuid, p_package_id uuid, p_item_id uuid, p_ndc text, p_product_name text, p_full integer, p_partial integer, p_price_per_unit numeric, p_total_value numeric
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_package_item(p_pharmacy_id uuid, p_package_id uuid, p_item_id uuid, p_ndc text, p_product_name text, p_full integer, p_partial integer, p_price_per_unit numeric, p_total_value numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.update_package_item(p_pharmacy_id uuid, p_package_id uuid, p_item_id uuid, p_ndc text DEFAULT NULL::text, p_product_name text DEFAULT NULL::text, p_full integer DEFAULT NULL::integer, p_partial integer DEFAULT NULL::integer, p_price_per_unit numeric DEFAULT NULL::numeric, p_total_value numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
