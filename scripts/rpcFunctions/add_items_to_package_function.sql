-- =====================================================
-- RPC Function: add_items_to_custom_package
-- Purpose: Add or update items in a custom package
-- If product_id exists, increment quantities (full/partial)
-- If product_id is new, insert as new item
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS add_items_to_custom_package(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION add_items_to_custom_package(
  p_pharmacy_id uuid,
  p_package_id uuid,
  p_items jsonb -- Array of { ndc, productId, productName, full, partial, pricePerUnit, totalValue }
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_package record;
  v_item record;
  v_existing_item record;
  v_ndc text;
  v_product_id uuid;
  v_product_name text;
  v_full integer;
  v_partial integer;
  v_price_per_unit numeric;
  v_total_value numeric;
  v_fee_rate numeric;
  v_discount_multiplier numeric;
  v_discounted_total_value numeric;
  v_new_full integer;
  v_new_partial integer;
  v_new_total_value numeric;
  v_total_items integer;
  v_total_estimated_value numeric;
  v_original_total numeric;
  v_fee_amount numeric;
  v_net_estimated_value numeric;
  v_items_added integer := 0;
  v_items_updated integer := 0;
  v_distributor record;
  v_location text := null;
  v_distributor_contact jsonb := null;
  v_items_result jsonb := '[]'::jsonb;
BEGIN
  -- Step 1: Validate inputs
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pharmacy ID is required'
    );
  END IF;

  IF p_package_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Package ID is required'
    );
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'At least one item is required'
    );
  END IF;

  -- Step 2: Check if package exists and belongs to pharmacy
  SELECT 
    cp.id,
    cp.package_number,
    cp.pharmacy_id,
    cp.distributor_name,
    cp.distributor_id,
    cp.total_items,
    cp.total_estimated_value,
    cp.fee_rate,
    cp.fee_amount,
    cp.fee_duration,
    cp.net_estimated_value,
    cp.notes,
    cp.status,
    cp.created_at,
    cp.updated_at
  INTO v_package
  FROM custom_packages cp
  WHERE cp.id = p_package_id AND cp.pharmacy_id = p_pharmacy_id;

  IF v_package IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Package not found or you do not have permission to update it'
    );
  END IF;

  -- Step 3: Check if package is already delivered (status = true)
  IF v_package.status = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot add items to a delivered package. Only non-delivered packages can be updated.'
    );
  END IF;

  -- Step 4: Calculate discount multiplier from fee rate
  v_fee_rate := COALESCE(v_package.fee_rate, 0);
  v_discount_multiplier := CASE WHEN v_fee_rate > 0 THEN (100 - v_fee_rate) / 100 ELSE 1 END;

  -- Step 5: Process each item - either update existing or insert new
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Extract item fields
    v_ndc := v_item.value->>'ndc';
    v_product_id := (v_item.value->>'productId')::uuid;
    v_product_name := v_item.value->>'productName';
    v_full := COALESCE((v_item.value->>'full')::integer, 0);
    v_partial := COALESCE((v_item.value->>'partial')::integer, 0);
    v_price_per_unit := COALESCE((v_item.value->>'pricePerUnit')::numeric, 0);
    v_total_value := COALESCE((v_item.value->>'totalValue')::numeric, 0);

    -- Validate required fields
    IF v_ndc IS NULL OR v_ndc = '' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'NDC is required for all items'
      );
    END IF;

    IF v_product_name IS NULL OR v_product_name = '' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Product name is required for all items'
      );
    END IF;

    IF v_full < 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Full units cannot be negative'
      );
    END IF;

    IF v_partial < 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Partial units cannot be negative'
      );
    END IF;

    IF v_full = 0 AND v_partial = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'At least one of full or partial must be greater than 0 for all items'
      );
    END IF;

    -- Apply discount to total value
    v_discounted_total_value := ROUND(v_total_value * v_discount_multiplier, 2);

    -- Check if product_id already exists in the package
    IF v_product_id IS NOT NULL THEN
      SELECT 
        cpi.id,
        cpi."full",
        cpi."partial",
        cpi.total_value,
        cpi.price_per_unit
      INTO v_existing_item
      FROM custom_package_items cpi
      WHERE cpi.package_id = p_package_id AND cpi.product_id = v_product_id;

      IF v_existing_item IS NOT NULL THEN
        -- Product exists - increment quantities
        v_new_full := v_existing_item."full" + v_full;
        v_new_partial := v_existing_item."partial" + v_partial;
        v_new_total_value := v_existing_item.total_value + v_discounted_total_value;

        -- Update existing item
        UPDATE custom_package_items
        SET 
          "full" = v_new_full,
          "partial" = v_new_partial,
          total_value = v_new_total_value,
          price_per_unit = COALESCE(NULLIF(v_price_per_unit, 0), v_existing_item.price_per_unit)
        WHERE id = v_existing_item.id;

        v_items_updated := v_items_updated + 1;
      ELSE
        -- Product doesn't exist - insert new item
        INSERT INTO custom_package_items (
          package_id,
          ndc,
          product_id,
          product_name,
          "full",
          "partial",
          price_per_unit,
          total_value
        ) VALUES (
          p_package_id,
          v_ndc,
          v_product_id,
          v_product_name,
          v_full,
          v_partial,
          v_price_per_unit,
          v_discounted_total_value
        );

        v_items_added := v_items_added + 1;
      END IF;
    ELSE
      -- No product_id - always insert new item
      INSERT INTO custom_package_items (
        package_id,
        ndc,
        product_id,
        product_name,
        "full",
        "partial",
        price_per_unit,
        total_value
      ) VALUES (
        p_package_id,
        v_ndc,
        NULL,
        v_product_name,
        v_full,
        v_partial,
        v_price_per_unit,
        v_discounted_total_value
      );

      v_items_added := v_items_added + 1;
    END IF;
  END LOOP;

  -- Step 6: Calculate new package totals
  SELECT 
    COALESCE(SUM(cpi."full" + cpi."partial"), 0),
    COALESCE(SUM(cpi.total_value), 0)
  INTO v_total_items, v_total_estimated_value
  FROM custom_package_items cpi
  WHERE cpi.package_id = p_package_id;

  -- Calculate fee amount based on original total
  v_original_total := CASE WHEN v_fee_rate > 0 THEN v_total_estimated_value / ((100 - v_fee_rate) / 100) ELSE v_total_estimated_value END;
  v_fee_amount := v_original_total - v_total_estimated_value;
  v_net_estimated_value := v_total_estimated_value;

  -- Step 7: Update package totals
  UPDATE custom_packages
  SET 
    total_items = v_total_items,
    total_estimated_value = v_total_estimated_value,
    fee_amount = ROUND(v_fee_amount, 2),
    net_estimated_value = ROUND(v_net_estimated_value, 2),
    updated_at = now()
  WHERE id = p_package_id AND pharmacy_id = p_pharmacy_id;

  -- Step 8: Fetch updated package with items
  SELECT 
    cp.id,
    cp.package_number,
    cp.pharmacy_id,
    cp.distributor_name,
    cp.distributor_id,
    cp.total_items,
    cp.total_estimated_value,
    cp.fee_rate,
    cp.fee_amount,
    cp.fee_duration,
    cp.net_estimated_value,
    cp.notes,
    cp.status,
    cp.created_at,
    cp.updated_at
  INTO v_package
  FROM custom_packages cp
  WHERE cp.id = p_package_id;

  -- Step 9: Get distributor contact info if distributor_id exists
  IF v_package.distributor_id IS NOT NULL THEN
    SELECT 
      rd.id,
      rd.name,
      rd.contact_email,
      rd.contact_phone,
      rd.address
    INTO v_distributor
    FROM reverse_distributors rd
    WHERE rd.id = v_package.distributor_id;

    IF v_distributor IS NOT NULL THEN
      -- Build location string from address
      IF v_distributor.address IS NOT NULL THEN
        SELECT string_agg(part, ', ')
        INTO v_location
        FROM (
          SELECT unnest(ARRAY[
            v_distributor.address->>'street',
            v_distributor.address->>'city',
            v_distributor.address->>'state',
            v_distributor.address->>'zipCode',
            v_distributor.address->>'country'
          ]) AS part
        ) parts
        WHERE part IS NOT NULL AND part != '';
      END IF;

      v_distributor_contact := jsonb_build_object(
        'id', v_distributor.id,
        'name', v_distributor.name,
        'email', v_distributor.contact_email,
        'phone', v_distributor.contact_phone,
        'location', v_location
      );
    END IF;
  END IF;

  -- Step 10: Fetch all items for the package
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cpi.id,
      'ndc', cpi.ndc,
      'productId', cpi.product_id,
      'productName', cpi.product_name,
      'full', cpi."full",
      'partial', cpi."partial",
      'pricePerUnit', cpi.price_per_unit,
      'totalValue', cpi.total_value,
      'createdAt', cpi.created_at
    ) ORDER BY cpi.created_at
  )
  INTO v_items_result
  FROM custom_package_items cpi
  WHERE cpi.package_id = p_package_id;

  -- Step 11: Build and return the result
  v_result := jsonb_build_object(
    'success', true,
    'message', format('%s item(s) added, %s item(s) updated', v_items_added, v_items_updated),
    'data', jsonb_build_object(
      'id', v_package.id,
      'packageNumber', v_package.package_number,
      'pharmacyId', v_package.pharmacy_id,
      'distributorName', v_package.distributor_name,
      'distributorId', v_package.distributor_id,
      'distributorContact', v_distributor_contact,
      'totalItems', v_package.total_items,
      'totalEstimatedValue', v_package.total_estimated_value,
      'feeRate', v_package.fee_rate,
      'feeAmount', v_package.fee_amount,
      'feeDuration', v_package.fee_duration,
      'netEstimatedValue', v_package.net_estimated_value,
      'notes', v_package.notes,
      'status', v_package.status,
      'createdAt', v_package.created_at,
      'updatedAt', v_package.updated_at,
      'items', COALESCE(v_items_result, '[]'::jsonb)
    ),
    'itemsAdded', v_items_added,
    'itemsUpdated', v_items_updated
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_items_to_custom_package(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION add_items_to_custom_package(uuid, uuid, jsonb) TO service_role;

-- Add comment
COMMENT ON FUNCTION add_items_to_custom_package IS 'Add or update items in a custom package. If product_id exists, increments quantities. If product_id is new, inserts as new item. No JS logic required - all handled in database.';
