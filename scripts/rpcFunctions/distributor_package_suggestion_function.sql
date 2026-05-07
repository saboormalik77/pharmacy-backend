-- =====================================================
-- RPC Function: get_distributor_package_suggestion
-- Purpose: Get package suggestion for a specific distributor
-- Similar to packages/suggestions but uses provided distributor
-- instead of finding best distributor
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_distributor_package_suggestion(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION get_distributor_package_suggestion(
  p_pharmacy_id uuid,
  p_distributor_id uuid,
  p_items jsonb -- Array of { ndc, productId, productName, full, partial }
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_distributor record;
  v_existing_package record;
  v_products jsonb := '[]'::jsonb;
  v_total_items integer := 0;
  v_total_estimated_value numeric := 0;
  v_products_with_pricing integer := 0;
  v_products_without_pricing integer := 0;
  v_item record;
  v_ndc text;
  v_normalized_ndc text;
  v_product_id text;
  v_product_name text;
  v_full integer;
  v_partial integer;
  v_price_per_unit numeric;
  v_total_value numeric;
  v_product_name_from_db text;
  v_already_created boolean := false;
  v_existing_package_info jsonb := null;
  v_distributor_contact jsonb := null;
  v_location text := null;
BEGIN
  -- Step 1: Validate inputs
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pharmacy ID is required'
    );
  END IF;

  IF p_distributor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Distributor ID is required'
    );
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'packages', '[]'::jsonb,
        'totalProducts', 0,
        'totalPackages', 0,
        'totalEstimatedValue', 0,
        'generatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'summary', jsonb_build_object(
          'productsWithPricing', 0,
          'productsWithoutPricing', 0,
          'distributorsUsed', 0,
          'packagesAlreadyCreated', 0
        )
      )
    );
  END IF;

  -- Step 2: Get distributor information
  SELECT 
    rd.id,
    rd.name,
    rd.contact_email,
    rd.contact_phone,
    rd.address,
    rd.fee_rates,
    rd.is_active
  INTO v_distributor
  FROM reverse_distributors rd
  WHERE rd.id = p_distributor_id;

  IF v_distributor IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Distributor not found'
    );
  END IF;

  IF NOT v_distributor.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Distributor is not active'
    );
  END IF;

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

  -- Build distributor contact info
  v_distributor_contact := jsonb_build_object(
    'email', v_distributor.contact_email,
    'phone', v_distributor.contact_phone,
    'location', v_location,
    'feeRates', v_distributor.fee_rates
  );

  -- Step 3: Check if a non-delivered package already exists with this distributor
  SELECT 
    cp.id,
    cp.package_number,
    cp.total_items,
    cp.total_estimated_value,
    cp.fee_rate,
    cp.fee_duration,
    cp.created_at
  INTO v_existing_package
  FROM custom_packages cp
  WHERE cp.pharmacy_id = p_pharmacy_id
    AND cp.distributor_id = p_distributor_id
    AND cp.status = false -- Only non-delivered packages
  ORDER BY cp.created_at DESC
  LIMIT 1;

  IF v_existing_package IS NOT NULL THEN
    v_already_created := true;
    v_existing_package_info := jsonb_build_object(
      'id', v_existing_package.id,
      'packageNumber', v_existing_package.package_number,
      'totalItems', v_existing_package.total_items,
      'totalEstimatedValue', v_existing_package.total_estimated_value,
      'feeRate', v_existing_package.fee_rate,
      'feeDuration', v_existing_package.fee_duration,
      'createdAt', v_existing_package.created_at
    );
  END IF;

  -- Step 4: Process each item and get pricing from return reports
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_ndc := v_item.value->>'ndc';
    v_normalized_ndc := regexp_replace(v_ndc, '-', '', 'g');
    v_product_id := v_item.value->>'productId';
    v_product_name := v_item.value->>'productName';
    v_full := COALESCE((v_item.value->>'full')::integer, 0);
    v_partial := COALESCE((v_item.value->>'partial')::integer, 0);
    v_price_per_unit := 0;

    -- Skip if NDC is empty
    IF v_ndc IS NULL OR v_ndc = '' THEN
      CONTINUE;
    END IF;

    -- Get product name from database if not provided
    IF v_product_name IS NULL OR v_product_name = '' THEN
      SELECT p.product_name INTO v_product_name_from_db
      FROM products p
      WHERE p.ndc = v_ndc OR regexp_replace(p.ndc, '-', '', 'g') = v_normalized_ndc
      LIMIT 1;
      
      v_product_name := COALESCE(v_product_name_from_db, 'Product ' || v_ndc);
    END IF;

    -- Get latest price from return reports for this distributor and NDC
    -- Filter by unit type: if full > 0, get full-only records; if partial > 0, get partial-only records
    SELECT 
      COALESCE(
        (rr_item.value->>'pricePerUnit')::numeric,
        CASE 
          WHEN COALESCE((rr_item.value->>'quantity')::numeric, 0) > 0 
            AND COALESCE((rr_item.value->>'creditAmount')::numeric, 0) > 0
          THEN (rr_item.value->>'creditAmount')::numeric / (rr_item.value->>'quantity')::numeric
          ELSE 0
        END
      ) AS price_per_unit
    INTO v_price_per_unit
    FROM return_reports rr
    JOIN uploaded_documents ud ON ud.id = rr.document_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE 
        WHEN jsonb_typeof(rr.data->'items') = 'array' THEN rr.data->'items'
        WHEN rr.data->'items' IS NOT NULL THEN jsonb_build_array(rr.data->'items')
        WHEN rr.data->>'ndcCode' IS NOT NULL OR rr.data->>'ndc' IS NOT NULL THEN jsonb_build_array(rr.data)
        ELSE '[]'::jsonb
      END
    ) AS rr_item
    WHERE ud.reverse_distributor_id = p_distributor_id
      AND (
        -- Match NDC with or without dashes
        regexp_replace(COALESCE(rr_item.value->>'ndcCode', rr_item.value->>'ndc', ''), '-', '', 'g') = v_normalized_ndc
        OR COALESCE(rr_item.value->>'ndcCode', rr_item.value->>'ndc', '') = v_ndc
      )
      AND (
        -- Unit type filtering
        CASE
          -- If only full units requested, get records with full > 0 and partial = 0
          WHEN v_full > 0 AND v_partial = 0 THEN
            COALESCE((rr_item.value->>'full')::integer, 0) > 0 
            AND COALESCE((rr_item.value->>'partial')::integer, 0) = 0
          -- If only partial units requested, get records with partial > 0 and full = 0
          WHEN v_partial > 0 AND v_full = 0 THEN
            COALESCE((rr_item.value->>'partial')::integer, 0) > 0 
            AND COALESCE((rr_item.value->>'full')::integer, 0) = 0
          -- If both full and partial, accept either type of record
          ELSE true
        END
      )
      AND (
        COALESCE((rr_item.value->>'pricePerUnit')::numeric, 0) > 0
        OR (
          COALESCE((rr_item.value->>'quantity')::numeric, 0) > 0 
          AND COALESCE((rr_item.value->>'creditAmount')::numeric, 0) > 0
        )
      )
    ORDER BY COALESCE(ud.report_date, ud.uploaded_at, rr.created_at) DESC
    LIMIT 1;

    -- Calculate total value
    v_price_per_unit := COALESCE(v_price_per_unit, 0);
    v_total_value := v_price_per_unit * (v_full + v_partial);

    -- Track pricing statistics
    IF v_price_per_unit > 0 THEN
      v_products_with_pricing := v_products_with_pricing + 1;
    ELSE
      v_products_without_pricing := v_products_without_pricing + 1;
    END IF;

    -- Add to products array
    v_products := v_products || jsonb_build_object(
      'ndc', v_ndc,
      'productId', v_product_id,
      'productName', v_product_name,
      'full', v_full,
      'partial', v_partial,
      'pricePerUnit', ROUND(v_price_per_unit::numeric, 2),
      'totalValue', ROUND(v_total_value::numeric, 2)
    );

    -- Update totals
    v_total_items := v_total_items + v_full + v_partial;
    v_total_estimated_value := v_total_estimated_value + v_total_value;
  END LOOP;

  -- Step 5: Build and return the result
  v_result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'packages', CASE 
        WHEN jsonb_array_length(v_products) > 0 THEN
          jsonb_build_array(
            jsonb_build_object(
              'distributorName', v_distributor.name,
              'distributorId', v_distributor.id,
              'distributorContact', v_distributor_contact,
              'products', v_products,
              'totalItems', v_total_items,
              'totalEstimatedValue', ROUND(v_total_estimated_value::numeric, 2),
              'averagePricePerUnit', CASE 
                WHEN v_total_items > 0 THEN ROUND((v_total_estimated_value / v_total_items)::numeric, 2)
                ELSE 0
              END,
              'alreadyCreated', v_already_created,
              'existingPackage', v_existing_package_info
            )
          )
        ELSE '[]'::jsonb
      END,
      'totalProducts', jsonb_array_length(v_products),
      'totalPackages', CASE WHEN jsonb_array_length(v_products) > 0 THEN 1 ELSE 0 END,
      'totalEstimatedValue', ROUND(v_total_estimated_value::numeric, 2),
      'generatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'summary', jsonb_build_object(
        'productsWithPricing', v_products_with_pricing,
        'productsWithoutPricing', v_products_without_pricing,
        'distributorsUsed', CASE WHEN jsonb_array_length(v_products) > 0 THEN 1 ELSE 0 END,
        'packagesAlreadyCreated', CASE WHEN v_already_created THEN 1 ELSE 0 END
      )
    )
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_distributor_package_suggestion(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_distributor_package_suggestion(uuid, uuid, jsonb) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_distributor_package_suggestion IS 'Get package suggestion for a specific distributor. Takes pharmacy_id, distributor_id, and items array. Returns pricing data for that distributor only.';

