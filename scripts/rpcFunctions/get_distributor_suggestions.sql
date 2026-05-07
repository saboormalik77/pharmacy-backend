-- =====================================================
-- RPC Function: get_distributor_suggestions
-- =====================================================
-- Replaces all JS logic in getDistributorSuggestionsByMultipleNdcs
-- Returns distributor suggestions for given NDCs with pricing data
-- NO JS loops needed - everything done in SQL
-- =====================================================

-- Drop existing objects
DROP FUNCTION IF EXISTS get_distributor_suggestions(UUID, JSONB);

-- Main RPC function
CREATE OR REPLACE FUNCTION get_distributor_suggestions(
    p_pharmacy_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total_items INTEGER := 0;
    v_item_count INTEGER;
    v_invalid_item JSONB;
    v_missing_ndc TEXT;
    v_missing_product_name TEXT;
BEGIN
    -- =====================================================
    -- SECURITY: Check pharmacy status (block suspended/blacklisted)
    -- =====================================================
    PERFORM check_pharmacy_status(p_pharmacy_id);
    
    -- =====================================================
    -- STEP 1: Basic Validation
    -- =====================================================
    
    -- Validate items array is not empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one item with NDC and full/partial units is required';
    END IF;
    
    -- =====================================================
    -- STEP 2: Create temp table for requested items
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_requested_items;
    CREATE TEMP TABLE temp_requested_items AS
    SELECT 
        TRIM(item->>'ndc') AS ndc,
        REPLACE(TRIM(COALESCE(item->>'ndc', '')), '-', '') AS normalized_ndc,
        item->>'product' AS input_product_name,
        COALESCE((item->>'full')::INTEGER, 0) AS full_count,
        COALESCE((item->>'partial')::INTEGER, 0) AS partial_count
    FROM jsonb_array_elements(p_items) AS item
    WHERE TRIM(COALESCE(item->>'ndc', '')) != '';
    
    -- =====================================================
    -- STEP 3: Validate full/partial counts
    -- =====================================================
    
    SELECT item INTO v_invalid_item
    FROM jsonb_array_elements(p_items) AS item
    WHERE COALESCE((item->>'full')::INTEGER, 0) + COALESCE((item->>'partial')::INTEGER, 0) <= 0
    LIMIT 1;
    
    IF v_invalid_item IS NOT NULL THEN
        RAISE EXCEPTION 'NDC %: At least one of full or partial must be greater than 0', v_invalid_item->>'ndc';
    END IF;
    
    -- =====================================================
    -- STEP 4: Validate items exist in pharmacy inventory
    -- =====================================================
    
    SELECT tri.ndc INTO v_missing_ndc
    FROM temp_requested_items tri
    WHERE NOT EXISTS (
        SELECT 1 FROM product_list_items pli
        WHERE pli.added_by = p_pharmacy_id
        AND (
            REPLACE(COALESCE(pli.ndc::TEXT, ''), '-', '') = tri.normalized_ndc
            OR TRIM(COALESCE(pli.ndc::TEXT, '')) = tri.ndc
        )
    )
    LIMIT 1;
    
    IF v_missing_ndc IS NOT NULL THEN
        -- Get product name for error message
        SELECT COALESCE(
            (SELECT product_name FROM products WHERE REPLACE(COALESCE(ndc::TEXT, ''), '-', '') = REPLACE(v_missing_ndc, '-', '') LIMIT 1),
            'Product ' || v_missing_ndc
        ) INTO v_missing_product_name;
        
        RAISE EXCEPTION 'You don''t have this product in your inventory. NDC: %, Product: %', v_missing_ndc, v_missing_product_name;
    END IF;
    
    -- =====================================================
    -- STEP 5: Calculate total items
    -- =====================================================
    
    SELECT SUM(full_count + partial_count) INTO v_total_items FROM temp_requested_items;
    
    -- =====================================================
    -- STEP 6: Add product names to requested items
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_items_with_names;
    CREATE TEMP TABLE temp_items_with_names AS
    SELECT 
        tri.ndc,
        tri.normalized_ndc,
        tri.full_count,
        tri.partial_count,
        COALESCE(
            NULLIF(tri.input_product_name, ''),
            (SELECT p.product_name FROM products p WHERE REPLACE(COALESCE(p.ndc::TEXT, ''), '-', '') = tri.normalized_ndc LIMIT 1),
            (SELECT pli.product_name FROM product_list_items pli WHERE pli.added_by = p_pharmacy_id AND REPLACE(COALESCE(pli.ndc::TEXT, ''), '-', '') = tri.normalized_ndc LIMIT 1),
            'Product ' || tri.ndc
        ) AS product_name
    FROM temp_requested_items tri;
    
    -- =====================================================
    -- STEP 7: Extract pricing from return_reports
    -- Get latest FULL and PARTIAL prices separately
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_all_prices;
    CREATE TEMP TABLE temp_all_prices AS
    WITH report_items AS (
        -- Extract items from return_reports JSONB data
        -- NOTE: Each row in return_reports has data as a single item object
        SELECT 
            rd.id AS distributor_id,
            rd.name AS distributor_name,
            ud.report_date,
            -- data column IS the item directly (not data->'items')
            REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '') AS normalized_ndc,
            COALESCE((rr.data->>'full')::INTEGER, 0) AS item_full,
            COALESCE((rr.data->>'partial')::INTEGER, 0) AS item_partial,
            COALESCE(
                (rr.data->>'pricePerUnit')::NUMERIC,
                CASE 
                    WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
                    THEN COALESCE((rr.data->>'creditAmount')::NUMERIC, 0) / GREATEST(COALESCE((rr.data->>'quantity')::INTEGER, 1), 1)
                    ELSE 0 
                END
            ) AS price_per_unit
        FROM return_reports rr
        JOIN uploaded_documents ud ON rr.document_id = ud.id
        JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
        WHERE COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') IS NOT NULL
    )
    SELECT 
        ri.distributor_id,
        ri.distributor_name,
        ri.normalized_ndc,
        ri.report_date,
        ri.price_per_unit,
        -- Is this a FULL price record? (full > 0 AND partial = 0)
        (ri.item_full > 0 AND ri.item_partial = 0) AS is_full_record,
        -- Is this a PARTIAL price record? (partial > 0 AND full = 0)
        (ri.item_partial > 0 AND ri.item_full = 0) AS is_partial_record
    FROM report_items ri
    WHERE ri.price_per_unit > 0
    AND ri.normalized_ndc IN (SELECT normalized_ndc FROM temp_items_with_names);
    
    -- =====================================================
    -- STEP 8: Get latest FULL price per distributor-NDC
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_latest_full_prices;
    CREATE TEMP TABLE temp_latest_full_prices AS
    SELECT DISTINCT ON (distributor_id, normalized_ndc)
        distributor_id,
        distributor_name,
        normalized_ndc,
        price_per_unit AS full_price
    FROM temp_all_prices
    WHERE is_full_record = true
    ORDER BY distributor_id, normalized_ndc, report_date DESC;
    
    -- =====================================================
    -- STEP 9: Get latest PARTIAL price per distributor-NDC
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_latest_partial_prices;
    CREATE TEMP TABLE temp_latest_partial_prices AS
    SELECT DISTINCT ON (distributor_id, normalized_ndc)
        distributor_id,
        distributor_name,
        normalized_ndc,
        price_per_unit AS partial_price
    FROM temp_all_prices
    WHERE is_partial_record = true
    ORDER BY distributor_id, normalized_ndc, report_date DESC;
    
    -- =====================================================
    -- STEP 10: Build final result using CTEs
    -- =====================================================
    
    WITH 
    -- All distributors with their contact info and fee_rates
    all_distributors AS (
        SELECT 
            rd.id AS distributor_id,
            rd.name AS distributor_name,
            rd.contact_email,
            rd.contact_phone,
            NULLIF(TRIM(CONCAT_WS(', ',
                NULLIF(rd.address->>'street', ''),
                NULLIF(rd.address->>'city', ''),
                NULLIF(rd.address->>'state', ''),
                NULLIF(rd.address->>'zipCode', ''),
                NULLIF(rd.address->>'country', '')
            )), '') AS location,
            rd.fee_rates
        FROM reverse_distributors rd
    ),
    
    -- Cross join distributors with requested items and add pricing
    distributor_products AS (
        SELECT 
            ad.distributor_id,
            ad.distributor_name,
            ad.contact_email,
            ad.contact_phone,
            ad.location,
            ad.fee_rates,
            ti.ndc,
            ti.normalized_ndc,
            ti.product_name,
            ti.full_count,
            ti.partial_count,
            lfp.full_price AS full_price_per_unit,
            lpp.partial_price AS partial_price_per_unit,
            -- Calculate total value
            ROUND(
                COALESCE(ti.full_count * lfp.full_price, 0) + 
                COALESCE(ti.partial_count * lpp.partial_price, 0), 
            2) AS total_estimated_value
        FROM all_distributors ad
        CROSS JOIN temp_items_with_names ti
        LEFT JOIN temp_latest_full_prices lfp 
            ON lfp.distributor_id = ad.distributor_id 
            AND lfp.normalized_ndc = ti.normalized_ndc
        LEFT JOIN temp_latest_partial_prices lpp 
            ON lpp.distributor_id = ad.distributor_id 
            AND lpp.normalized_ndc = ti.normalized_ndc
    ),
    
    -- Aggregate products per distributor
    distributor_aggregated AS (
        SELECT 
            dp.distributor_id,
            dp.distributor_name,
            dp.contact_email,
            dp.contact_phone,
            dp.location,
            dp.fee_rates,
            -- Build products array
            jsonb_agg(
                jsonb_build_object(
                    'ndc', dp.ndc,
                    'productName', dp.product_name,
                    'full', dp.full_count,
                    'partial', dp.partial_count,
                    'fullPricePerUnit', ROUND(COALESCE(dp.full_price_per_unit, 0), 2),
                    'partialPricePerUnit', ROUND(COALESCE(dp.partial_price_per_unit, 0), 2),
                    'totalEstimatedValue', dp.total_estimated_value
                )
            ) AS products,
            SUM(dp.full_count + dp.partial_count)::INTEGER AS total_items,
            ROUND(SUM(dp.total_estimated_value), 2) AS total_estimated_value,
            COUNT(*)::INTEGER AS ndcs_count
        FROM distributor_products dp
        GROUP BY dp.distributor_id, dp.distributor_name, dp.contact_email, dp.contact_phone, dp.location, dp.fee_rates
    ),
    
    -- Add row number to identify recommended (first one with highest value)
    distributor_ranked AS (
        SELECT 
            da.*,
            ROW_NUMBER() OVER (ORDER BY da.total_estimated_value DESC) AS rank
        FROM distributor_aggregated da
    ),
    
    -- Build distributors array sorted by total value DESC
    -- First distributor (highest total value) is marked as recommended
    distributors_json AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'distributorName', dr.distributor_name,
                'distributorId', dr.distributor_id,
                'distributorContact', jsonb_build_object(
                    'email', dr.contact_email,
                    'phone', dr.contact_phone,
                    'location', dr.location
                ),
                'feeRates', dr.fee_rates,
                'products', dr.products,
                'totalItems', dr.total_items,
                'totalEstimatedValue', dr.total_estimated_value,
                'ndcsCount', dr.ndcs_count,
                'recommended', dr.rank = 1  -- First distributor (highest value) is recommended
            ) ORDER BY dr.total_estimated_value DESC
        ) AS distributors
        FROM distributor_ranked dr
    ),
    
    -- Find NDCs without any pricing from any distributor
    ndcs_with_pricing AS (
        SELECT DISTINCT normalized_ndc 
        FROM temp_latest_full_prices
        UNION
        SELECT DISTINCT normalized_ndc 
        FROM temp_latest_partial_prices
    ),
    
    ndcs_without_distributors_json AS (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'ndc', ti.ndc,
                'productName', ti.product_name,
                'full', ti.full_count,
                'partial', ti.partial_count,
                'reason', 'No distributor found offering returns for this NDC'
            )
        ), '[]'::JSONB) AS ndcs_without
        FROM temp_items_with_names ti
        WHERE ti.normalized_ndc NOT IN (SELECT normalized_ndc FROM ndcs_with_pricing)
    ),
    
    -- Calculate totals
    totals AS (
        SELECT 
            COALESCE(SUM(da.total_estimated_value), 0) AS grand_total,
            COUNT(*) AS distributor_count
        FROM distributor_aggregated da
    )
    
    -- Build final result
    SELECT jsonb_build_object(
        'distributors', COALESCE((SELECT distributors FROM distributors_json), '[]'::JSONB),
        'ndcsWithoutDistributors', (SELECT ndcs_without FROM ndcs_without_distributors_json),
        'totalItems', v_total_items,
        'totalDistributors', (SELECT distributor_count FROM totals)::INTEGER,
        'totalEstimatedValue', ROUND((SELECT grand_total FROM totals), 2),
        'generatedAt', NOW()
    ) INTO v_result;
    
    -- =====================================================
    -- CLEANUP
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_requested_items;
    DROP TABLE IF EXISTS temp_items_with_names;
    DROP TABLE IF EXISTS temp_all_prices;
    DROP TABLE IF EXISTS temp_latest_full_prices;
    DROP TABLE IF EXISTS temp_latest_partial_prices;
    
    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_distributor_suggestions(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_distributor_suggestions(UUID, JSONB) TO service_role;

-- =====================================================
-- Example usage:
-- =====================================================
-- SELECT get_distributor_suggestions(
--     '3e19f01d-511d-421f-9cc6-ed83d33e034d'::UUID,
--     '[{"ndc": "00187-5115-60", "full": 2, "partial": 1}]'::JSONB
-- );
