-- =====================================================
-- RPC Function: get_package_recommendations
-- =====================================================
-- Replaces all JS logic in getPackageRecommendations
-- Returns package recommendations for pharmacy's inventory
-- Grouped by best distributor per NDC
-- NO JS loops needed - everything done in SQL
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_package_recommendations(UUID);

-- Main RPC function
CREATE OR REPLACE FUNCTION get_package_recommendations(
    p_pharmacy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total_products INTEGER := 0;
BEGIN
    -- =====================================================
    -- SECURITY: Check pharmacy status (block suspended/blacklisted)
    -- =====================================================
    PERFORM check_pharmacy_status(p_pharmacy_id);
    
    -- =====================================================
    -- STEP 1: Get all product_list_items for this pharmacy
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_product_items;
    CREATE TEMP TABLE temp_product_items AS
    SELECT 
        pli.id AS product_id,
        pli.ndc,
        REPLACE(COALESCE(pli.ndc::TEXT, ''), '-', '') AS normalized_ndc,
        pli.product_name,
        COALESCE(pli.full_units, 0) AS full_units,
        COALESCE(pli.partial_units, 0) AS partial_units,
        -- Determine what price type this item needs based on inventory
        (COALESCE(pli.partial_units, 0) = 0 AND COALESCE(pli.full_units, 0) > 0) AS needs_full_price,
        (COALESCE(pli.full_units, 0) = 0 AND COALESCE(pli.partial_units, 0) > 0) AS needs_partial_price
    FROM product_list_items pli
    WHERE pli.added_by = p_pharmacy_id;
    
    -- Get total products count
    SELECT COUNT(*) INTO v_total_products FROM temp_product_items;
    
    -- Return empty if no products
    IF v_total_products = 0 THEN
        RETURN jsonb_build_object(
            'packages', '[]'::JSONB,
            'totalProducts', 0,
            'totalPackages', 0,
            'totalEstimatedValue', 0,
            'generatedAt', NOW(),
            'summary', jsonb_build_object(
                'productsWithPricing', 0,
                'productsWithoutPricing', 0,
                'distributorsUsed', 0
            )
        );
    END IF;
    
    -- =====================================================
    -- STEP 2: Extract pricing from return_reports
    -- Get FULL and PARTIAL prices separately
    -- NOTE: Each row in return_reports has data as a single item object
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_all_prices;
    CREATE TEMP TABLE temp_all_prices AS
    WITH report_items AS (
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
        ri.item_full,
        ri.item_partial,
        -- Is this a FULL price record? (full > 0 AND partial = 0)
        (ri.item_full > 0 AND ri.item_partial = 0) AS is_full_record,
        -- Is this a PARTIAL price record? (partial > 0 AND full = 0)  
        (ri.item_partial > 0 AND ri.item_full = 0) AS is_partial_record
    FROM report_items ri
    WHERE ri.price_per_unit > 0
    AND ri.normalized_ndc IN (SELECT normalized_ndc FROM temp_product_items);
    
    -- =====================================================
    -- STEP 3: Get latest FULL price per distributor-NDC
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
    -- STEP 4: Get latest PARTIAL price per distributor-NDC
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
    -- STEP 5: Get best price per NDC (matching unit type)
    -- For full items, use full price. For partial items, use partial price.
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_best_prices;
    CREATE TEMP TABLE temp_best_prices AS
    WITH ndc_distributor_prices AS (
        SELECT 
            ti.product_id,
            ti.ndc,
            ti.normalized_ndc,
            ti.product_name,
            ti.full_units,
            ti.partial_units,
            ti.needs_full_price,
            ti.needs_partial_price,
            -- Use COALESCE to get distributor from whichever price table matches
            COALESCE(lfp.distributor_id, lpp.distributor_id) AS distributor_id,
            COALESCE(lfp.distributor_name, lpp.distributor_name) AS distributor_name,
            -- Use the appropriate price based on what the inventory item needs
            CASE 
                WHEN ti.needs_full_price THEN lfp.full_price
                WHEN ti.needs_partial_price THEN lpp.partial_price
                ELSE COALESCE(lfp.full_price, lpp.partial_price)
            END AS price_per_unit
        FROM temp_product_items ti
        LEFT JOIN temp_latest_full_prices lfp 
            ON lfp.normalized_ndc = ti.normalized_ndc
            AND (ti.needs_full_price OR (NOT ti.needs_full_price AND NOT ti.needs_partial_price))
        LEFT JOIN temp_latest_partial_prices lpp 
            ON lpp.normalized_ndc = ti.normalized_ndc
            AND (ti.needs_partial_price OR (NOT ti.needs_full_price AND NOT ti.needs_partial_price))
        WHERE 
            (ti.needs_full_price AND lfp.full_price IS NOT NULL)
            OR (ti.needs_partial_price AND lpp.partial_price IS NOT NULL)
            OR (NOT ti.needs_full_price AND NOT ti.needs_partial_price AND (lfp.full_price IS NOT NULL OR lpp.partial_price IS NOT NULL))
    ),
    -- Rank distributors by price (highest = best) for each product
    ranked_distributors AS (
        SELECT 
            ndp.*,
            ROW_NUMBER() OVER (PARTITION BY ndp.product_id ORDER BY ndp.price_per_unit DESC) AS rank
        FROM ndc_distributor_prices ndp
        WHERE ndp.price_per_unit IS NOT NULL AND ndp.price_per_unit > 0
    )
    -- Select only the best distributor for each product
    SELECT *
    FROM ranked_distributors
    WHERE rank = 1;
    
    -- =====================================================
    -- STEP 6: Get product_ids that already exist in custom packages
    -- These will be EXCLUDED from recommendations entirely
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_existing_product_ids;
    CREATE TEMP TABLE temp_existing_product_ids AS
    SELECT DISTINCT cpi.product_id
    FROM custom_package_items cpi
    JOIN custom_packages cp ON cp.id = cpi.package_id
    WHERE cp.pharmacy_id = p_pharmacy_id
    AND cpi.product_id IS NOT NULL;
    
    -- =====================================================
    -- STEP 7: Build final result
    -- =====================================================
    
    WITH 
    -- Get all distributors with contact info and fee_rates
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
    
    -- Filter out products that already exist in custom packages
    filtered_products AS (
        SELECT 
            bp.product_id,
            bp.ndc,
            bp.product_name,
            bp.full_units AS new_full,
            bp.partial_units AS new_partial,
            (bp.full_units + bp.partial_units) AS new_total,
            bp.distributor_id,
            bp.distributor_name,
            bp.price_per_unit
        FROM temp_best_prices bp
        WHERE bp.product_id NOT IN (SELECT product_id FROM temp_existing_product_ids)
    ),
    
    -- Aggregate products by distributor
    distributor_packages AS (
        SELECT 
            fp.distributor_id,
            fp.distributor_name,
            ad.contact_email,
            ad.contact_phone,
            ad.location,
            ad.fee_rates,
            jsonb_agg(
                jsonb_build_object(
                    'ndc', fp.ndc,
                    'productId', fp.product_id,
                    'productName', fp.product_name,
                    'full', fp.new_full,
                    'partial', fp.new_partial,
                    'pricePerUnit', ROUND(fp.price_per_unit, 2),
                    'totalValue', ROUND(fp.price_per_unit * fp.new_total, 2)
                )
            ) AS products,
            SUM(fp.new_total)::INTEGER AS total_items,
            ROUND(SUM(fp.price_per_unit * fp.new_total), 2) AS total_estimated_value,
            COUNT(*) AS product_count
        FROM filtered_products fp
        LEFT JOIN all_distributors ad ON ad.distributor_id = fp.distributor_id
        GROUP BY fp.distributor_id, fp.distributor_name, ad.contact_email, ad.contact_phone, ad.location, ad.fee_rates
    ),
    
    -- Build packages array
    packages_json AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'distributorName', dp.distributor_name,
                'distributorId', dp.distributor_id,
                'distributorContact', jsonb_build_object(
                    'email', dp.contact_email,
                    'phone', dp.contact_phone,
                    'location', dp.location,
                    'feeRates', dp.fee_rates
                ),
                'products', dp.products,
                'totalItems', dp.total_items,
                'totalEstimatedValue', dp.total_estimated_value,
                'averagePricePerUnit', CASE WHEN dp.total_items > 0 THEN ROUND(dp.total_estimated_value / dp.total_items, 2) ELSE 0 END
            ) ORDER BY dp.total_estimated_value DESC
        ) AS packages
        FROM distributor_packages dp
    ),
    
    -- Calculate summary
    summary_data AS (
        SELECT 
            (SELECT COUNT(DISTINCT product_id) FROM temp_best_prices) AS products_with_pricing,
            v_total_products - (SELECT COUNT(DISTINCT product_id) FROM temp_best_prices) AS products_without_pricing,
            (SELECT COUNT(DISTINCT distributor_id) FROM filtered_products) AS distributors_used,
            COALESCE((SELECT SUM(total_estimated_value) FROM distributor_packages), 0) AS total_value,
            (SELECT COUNT(*) FROM distributor_packages) AS total_packages
        FROM (SELECT 1) AS dummy
    )
    
    -- Build final result
    SELECT jsonb_build_object(
        'packages', COALESCE((SELECT packages FROM packages_json), '[]'::JSONB),
        'totalProducts', v_total_products,
        'totalPackages', (SELECT total_packages FROM summary_data)::INTEGER,
        'totalEstimatedValue', ROUND((SELECT total_value FROM summary_data), 2),
        'generatedAt', NOW(),
        'summary', jsonb_build_object(
            'productsWithPricing', (SELECT products_with_pricing FROM summary_data)::INTEGER,
            'productsWithoutPricing', (SELECT products_without_pricing FROM summary_data)::INTEGER,
            'distributorsUsed', (SELECT distributors_used FROM summary_data)::INTEGER
        )
    ) INTO v_result;
    
    -- =====================================================
    -- CLEANUP
    -- =====================================================
    
    DROP TABLE IF EXISTS temp_product_items;
    DROP TABLE IF EXISTS temp_all_prices;
    DROP TABLE IF EXISTS temp_latest_full_prices;
    DROP TABLE IF EXISTS temp_latest_partial_prices;
    DROP TABLE IF EXISTS temp_best_prices;
    DROP TABLE IF EXISTS temp_existing_product_ids;
    
    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_package_recommendations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_package_recommendations(UUID) TO service_role;

-- =====================================================
-- Example usage:
-- =====================================================
-- SELECT get_package_recommendations('3e19f01d-511d-421f-9cc6-ed83d33e034d'::UUID);

