-- ============================================================
-- SEARCH NDC PRICING V2 - Queries return_reports DIRECTLY
-- This function uses the EXACT same logic as optimizationService.ts
-- to ensure 100% identical pricing results
-- ============================================================

-- Drop old function first
DROP FUNCTION IF EXISTS search_ndc_pricing_v2(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION search_ndc_pricing_v2(
  p_search TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_normalized TEXT;
  v_results JSONB;
  v_count INTEGER;
BEGIN
  -- Return empty if search is too short (same validation as optimization service)
  IF p_search IS NULL OR LENGTH(TRIM(p_search)) < 2 THEN
    RETURN jsonb_build_object(
      'results', '[]'::jsonb,
      'count', 0,
      'searchTerm', p_search
    );
  END IF;

  -- Normalize search (remove dashes, lowercase) - same as optimization service line 519
  v_search_normalized := LOWER(REPLACE(TRIM(p_search), '-', ''));
  
  -- Main query that replicates optimization service logic EXACTLY
  WITH 
  -- Step 1: Get ALL return_reports EXACTLY like optimization service
  -- CRITICAL: No NDC filtering here - get ALL records first, then sort, then filter
  -- This matches optimization service: db.from('return_reports').select(selectFields)
  all_reports_unfiltered AS (
    SELECT 
      rr.id,
      rr.data,
      rr.document_id,
      rr.created_at,
      ud.report_date,
      ud.uploaded_at,
      rd.id AS distributor_id,
      rd.name AS rd_name,
      rd.contact_email,
      rd.contact_phone,
      rd.address,
      -- Extract NDC (same as optimization service line 509)
      COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_code,
      -- Normalize NDC (same as optimization service line 519)
      LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) AS ndc_normalized,
      -- Get distributor name with SAME fallback chain as optimization service (lines 455-458)
      TRIM(COALESCE(
        rd.name,
        rr.data->>'reverseDistributor',
        rr.data->'reverseDistributorInfo'->>'name',
        'Unknown Distributor'
      )) AS distributor_name,
      -- Get full and partial counts
      COALESCE((rr.data->>'full')::INTEGER, 0) AS item_full,
      COALESCE((rr.data->>'partial')::INTEGER, 0) AS item_partial,
      -- Calculate price per unit
      COALESCE(
        (rr.data->>'pricePerUnit')::DECIMAL,
        CASE 
          WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
            AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
          THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
          ELSE 0 
        END
      ) AS price_per_unit,
      -- Get product name
      COALESCE(
        NULLIF(TRIM(rr.data->>'itemName'), ''),
        NULLIF(TRIM(rr.data->>'productName'), ''),
        NULLIF(TRIM(rr.data->>'product_name'), ''),
        NULLIF(TRIM(rr.data->>'product'), ''),
        NULLIF(TRIM(rr.data->>'description'), ''),
        NULLIF(TRIM(rr.data->>'drugName'), ''),
        NULLIF(TRIM(rr.data->>'name'), '')
      ) AS product_name,
      -- JavaScript equivalent timestamp
      CASE 
        WHEN ud.report_date IS NOT NULL THEN EXTRACT(EPOCH FROM ud.report_date::TIMESTAMP WITH TIME ZONE) * 1000
        WHEN ud.uploaded_at IS NOT NULL THEN EXTRACT(EPOCH FROM ud.uploaded_at) * 1000
        WHEN rr.created_at IS NOT NULL THEN EXTRACT(EPOCH FROM rr.created_at) * 1000
        ELSE 0
      END AS sort_date_ms,
      COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at) AS sort_date
    FROM return_reports rr
    JOIN uploaded_documents ud ON rr.document_id = ud.id
    LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
    -- NO NDC FILTERING - get ALL records like optimization service
  ),
  
  -- Step 2: Sort ALL records like JavaScript does (lines 1904-1910)
  all_reports_sorted AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY sort_date_ms DESC, created_at ASC, id ASC) as global_sort_order
    FROM all_reports_unfiltered
  ),
  
  -- Step 3: Filter to matching NDCs AFTER sorting (like optimization service does in forEach)
  matched_reports AS (
    SELECT *
    FROM all_reports_sorted
    WHERE 
      ndc_normalized = v_search_normalized
      AND distributor_name != 'Unknown Distributor'
      AND ndc_code IS NOT NULL
      AND TRIM(ndc_code) != ''
  ),
  
  -- Step 3: Get LATEST FULL price per distributor using DISTINCT ON with global sort order
  -- This exactly replicates the optimization service's "first match wins" logic (lines 753-754)
  full_prices AS (
    SELECT DISTINCT ON (distributor_name)
      distributor_name,
      distributor_id,
      contact_email,
      contact_phone,
      address,
      ndc_code,
      ndc_normalized,
      product_name,
      price_per_unit AS full_price,
      sort_date
    FROM matched_reports
    WHERE item_full > 0 AND item_partial = 0  -- isFullRecord check (line 750)
      AND price_per_unit > 0  -- Only valid prices (line 702)
    ORDER BY distributor_name, sort_date_ms DESC, created_at ASC, id ASC
  ),
  
  -- Step 4: Get LATEST PARTIAL price per distributor using DISTINCT ON with global sort order
  -- This exactly replicates the optimization service's "first match wins" logic (lines 758-759)
  partial_prices AS (
    SELECT DISTINCT ON (distributor_name)
      distributor_name,
      distributor_id,
      contact_email,
      contact_phone,
      address,
      ndc_code,
      ndc_normalized,
      product_name,
      price_per_unit AS partial_price,
      sort_date
    FROM matched_reports
    WHERE item_partial > 0 AND item_full = 0  -- isPartialRecord check (line 751)
      AND price_per_unit > 0  -- Only valid prices
    ORDER BY distributor_name, sort_date_ms DESC, created_at ASC, id ASC
  ),
  
  -- Step 5: Get unique NDC info (use latest record for product name)
  ndc_info AS (
    SELECT DISTINCT ON (ndc_normalized)
      ndc_code,
      ndc_normalized,
      product_name
    FROM matched_reports
    WHERE product_name IS NOT NULL
    ORDER BY ndc_normalized, sort_date DESC NULLS LAST
  ),
  
  -- Step 6: Combine full and partial prices per distributor
  -- This mirrors optimization service logic at lines 1044-1060:
  -- fullPrice = distributorNdcToFullPriceMap[distributorNdcKey] || 0
  -- partialPrice = distributorNdcToPartialPriceMap[distributorNdcKey] || 0
  -- price = fullPrice > 0 ? fullPrice : partialPrice (search mode, lines 1051-1059)
  combined_distributors AS (
    SELECT 
      COALESCE(f.distributor_name, p.distributor_name) AS distributor_name,
      COALESCE(f.distributor_id, p.distributor_id) AS distributor_id,
      COALESCE(f.contact_email, p.contact_email) AS contact_email,
      COALESCE(f.contact_phone, p.contact_phone) AS contact_phone,
      COALESCE(f.address, p.address) AS address,
      COALESCE(f.ndc_code, p.ndc_code) AS ndc_code,
      COALESCE(f.ndc_normalized, p.ndc_normalized) AS ndc_normalized,
      COALESCE(f.product_name, p.product_name) AS product_name,
      COALESCE(f.full_price, 0) AS full_price,
      COALESCE(p.partial_price, 0) AS partial_price,
      -- price: Use full price if available, otherwise partial (same as optimization service lines 1051-1059)
      CASE 
        WHEN COALESCE(f.full_price, 0) > 0 THEN f.full_price
        ELSE COALESCE(p.partial_price, 0)
      END AS price,
      GREATEST(COALESCE(f.sort_date, '1970-01-01'::timestamp), COALESCE(p.sort_date, '1970-01-01'::timestamp)) AS sort_date
    FROM full_prices f
    FULL OUTER JOIN partial_prices p ON f.distributor_name = p.distributor_name
    -- Filter out distributors with no valid price
    WHERE COALESCE(f.full_price, 0) > 0 OR COALESCE(p.partial_price, 0) > 0
  ),
  
  -- Step 7: Build final result in format matching optimization API response
  final_result AS (
    SELECT 
      COALESCE(ni.ndc_code, (SELECT ndc_code FROM combined_distributors LIMIT 1)) AS ndc_original,
      v_search_normalized AS ndc_normalized,
      COALESCE(ni.product_name, (SELECT product_name FROM combined_distributors WHERE product_name IS NOT NULL LIMIT 1)) AS product_name,
      -- Build distributors array sorted by price DESC (highest first = best) - same as line 1133
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', cd.distributor_id,
            'name', cd.distributor_name,
            'fullPrice', cd.full_price,
            'partialPrice', cd.partial_price,
            'email', cd.contact_email,
            'phone', cd.contact_phone,
            'location', CASE 
              WHEN cd.address IS NOT NULL THEN 
                CONCAT_WS(', ', 
                  cd.address->>'city', 
                  cd.address->>'state'
                )
              ELSE NULL 
            END,
            'reportDate', cd.sort_date
          ) ORDER BY cd.price DESC NULLS LAST
        ), '[]'::jsonb)
        FROM combined_distributors cd
      ) AS distributors,
      -- Best full price (max of all distributors' latest full prices)
      (SELECT COALESCE(MAX(full_price), 0) FROM combined_distributors) AS best_full_price,
      -- Best partial price (max of all distributors' latest partial prices)
      (SELECT COALESCE(MAX(partial_price), 0) FROM combined_distributors) AS best_partial_price
    FROM ndc_info ni
    -- Use RIGHT JOIN to ensure we get results even if ndc_info is empty
    RIGHT JOIN (SELECT 1) dummy ON TRUE
    LIMIT 1
  )
  
  -- Build final response
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM combined_distributors) THEN
        jsonb_agg(
          jsonb_build_object(
            'ndc', fr.ndc_original,
            'ndcNormalized', fr.ndc_normalized,
            'productName', fr.product_name,
            'distributors', fr.distributors,
            'bestFullPrice', fr.best_full_price,
            'bestPartialPrice', fr.best_partial_price,
            -- Additional fields matching Recommendation interface
            'recommendedDistributor', COALESCE((fr.distributors->0->>'name'), ''),
            'recommendedDistributorId', (fr.distributors->0->>'id'),
            'fullPricePerUnit', fr.best_full_price,
            'partialPricePerUnit', fr.best_partial_price,
            'alternativeDistributors', COALESCE(
              (SELECT jsonb_agg(d) FROM jsonb_array_elements(fr.distributors) d OFFSET 1),
              '[]'::jsonb
            )
          )
        )
      ELSE '[]'::jsonb
    END,
    CASE WHEN EXISTS (SELECT 1 FROM combined_distributors) THEN 1 ELSE 0 END
  INTO v_results, v_count
  FROM final_result fr;
  
  RETURN jsonb_build_object(
    'results', COALESCE(v_results, '[]'::jsonb),
    'count', COALESCE(v_count, 0),
    'searchTerm', p_search
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_ndc_pricing_v2 TO authenticated;

-- ============================================================
-- ALSO UPDATE THE ORIGINAL search_ndc_pricing FUNCTION
-- This replaces the old function with the new logic
-- ============================================================

CREATE OR REPLACE FUNCTION search_ndc_pricing(
  p_search TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_normalized TEXT;
  v_results JSONB;
  v_count INTEGER;
BEGIN
  -- Return empty if search is too short (same validation as optimization service)
  IF p_search IS NULL OR LENGTH(TRIM(p_search)) < 2 THEN
    RETURN jsonb_build_object(
      'results', '[]'::jsonb,
      'count', 0,
      'searchTerm', p_search
    );
  END IF;

  -- Normalize search (remove dashes, lowercase) - same as optimization service line 519
  v_search_normalized := LOWER(REPLACE(TRIM(p_search), '-', ''));
  
  -- Main query that replicates optimization service logic EXACTLY
  WITH 
  -- Step 1: Get ALL return_reports with joins (same as optimization service lines 219-234)
  all_reports AS (
    SELECT 
      rr.id,
      rr.data,
      rr.document_id,
      rr.created_at,
      ud.report_date,
      ud.uploaded_at,
      rd.id AS distributor_id,
      rd.name AS rd_name,
      rd.contact_email,
      rd.contact_phone,
      rd.address,
      -- Extract NDC (same as optimization service line 509)
      COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_code,
      -- Normalize NDC (same as optimization service line 519)
      LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) AS ndc_normalized,
      -- Get distributor name with SAME fallback chain as optimization service (lines 455-458)
      TRIM(COALESCE(
        rd.name,
        rr.data->>'reverseDistributor',
        rr.data->'reverseDistributorInfo'->>'name',
        'Unknown Distributor'
      )) AS distributor_name,
      -- Get full and partial counts (same as optimization service lines 522-523)
      COALESCE((rr.data->>'full')::INTEGER, 0) AS item_full,
      COALESCE((rr.data->>'partial')::INTEGER, 0) AS item_partial,
      -- Calculate price per unit (same as optimization service line 689)
      COALESCE(
        (rr.data->>'pricePerUnit')::DECIMAL,
        CASE 
          WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
            AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
          THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
          ELSE 0 
        END
      ) AS price_per_unit,
      -- Get product name (same priority as optimization service line 622)
      COALESCE(
        NULLIF(TRIM(rr.data->>'itemName'), ''),
        NULLIF(TRIM(rr.data->>'productName'), ''),
        NULLIF(TRIM(rr.data->>'product_name'), ''),
        NULLIF(TRIM(rr.data->>'product'), ''),
        NULLIF(TRIM(rr.data->>'description'), ''),
        NULLIF(TRIM(rr.data->>'drugName'), ''),
        NULLIF(TRIM(rr.data->>'name'), '')
      ) AS product_name,
      -- Sort date calculation - EXACT JavaScript replication  
      CASE 
        WHEN ud.report_date IS NOT NULL THEN EXTRACT(EPOCH FROM ud.report_date::TIMESTAMP WITH TIME ZONE) * 1000
        WHEN ud.uploaded_at IS NOT NULL THEN EXTRACT(EPOCH FROM ud.uploaded_at) * 1000
        WHEN rr.created_at IS NOT NULL THEN EXTRACT(EPOCH FROM rr.created_at) * 1000
        ELSE 0
      END AS sort_date_ms,
      COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at) AS sort_date
    FROM return_reports rr
    JOIN uploaded_documents ud ON rr.document_id = ud.id
    LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
    WHERE 
      COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') IS NOT NULL
      AND TRIM(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', '')) != ''
      AND TRIM(COALESCE(
        rd.name,
        rr.data->>'reverseDistributor',
        rr.data->'reverseDistributorInfo'->>'name',
        'Unknown Distributor'
      )) != 'Unknown Distributor'
  ),
  
  -- Step 2: Sort ALL records like JavaScript does (lines 1904-1910)
  all_reports_sorted AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY sort_date_ms DESC, created_at ASC, id ASC) as global_sort_order
    FROM all_reports
  ),
  
  -- Step 3: Filter to matching NDCs AFTER sorting (like optimization service does in forEach)
  matched_reports AS (
    SELECT *
    FROM all_reports_sorted
    WHERE ndc_normalized = v_search_normalized
  ),
  
  -- Step 4: Get LATEST FULL price per distributor using DISTINCT ON with global sort order
  -- This exactly replicates the optimization service's "first match wins" logic (lines 753-754)
  full_prices AS (
    SELECT DISTINCT ON (distributor_name)
      distributor_name,
      distributor_id,
      contact_email,
      contact_phone,
      address,
      ndc_code,
      ndc_normalized,
      product_name,
      price_per_unit AS full_price,
      sort_date
    FROM matched_reports
    WHERE item_full > 0 AND item_partial = 0
      AND price_per_unit > 0
    ORDER BY distributor_name, sort_date_ms DESC, created_at ASC, id ASC
  ),
  
  -- Step 5: Get LATEST PARTIAL price per distributor using DISTINCT ON with global sort order
  -- This exactly replicates the optimization service's "first match wins" logic (lines 758-759)
  partial_prices AS (
    SELECT DISTINCT ON (distributor_name)
      distributor_name,
      distributor_id,
      contact_email,
      contact_phone,
      address,
      ndc_code,
      ndc_normalized,
      product_name,
      price_per_unit AS partial_price,
      sort_date
    FROM matched_reports
    WHERE item_partial > 0 AND item_full = 0
      AND price_per_unit > 0
    ORDER BY distributor_name, sort_date_ms DESC, created_at ASC, id ASC
  ),
  
  -- Step 5: Get unique NDC info
  ndc_info AS (
    SELECT DISTINCT ON (ndc_normalized)
      ndc_code,
      ndc_normalized,
      product_name
    FROM matched_reports
    WHERE product_name IS NOT NULL
    ORDER BY ndc_normalized, sort_date DESC NULLS LAST
  ),
  
  -- Step 6: Combine full and partial prices per distributor
  combined_distributors AS (
    SELECT 
      COALESCE(f.distributor_name, p.distributor_name) AS distributor_name,
      COALESCE(f.distributor_id, p.distributor_id) AS distributor_id,
      COALESCE(f.contact_email, p.contact_email) AS contact_email,
      COALESCE(f.contact_phone, p.contact_phone) AS contact_phone,
      COALESCE(f.address, p.address) AS address,
      COALESCE(f.ndc_code, p.ndc_code) AS ndc_code,
      COALESCE(f.ndc_normalized, p.ndc_normalized) AS ndc_normalized,
      COALESCE(f.product_name, p.product_name) AS product_name,
      COALESCE(f.full_price, 0) AS full_price,
      COALESCE(p.partial_price, 0) AS partial_price,
      -- price: full > 0 ? full : partial (optimization service lines 1051-1059)
      CASE 
        WHEN COALESCE(f.full_price, 0) > 0 THEN f.full_price
        ELSE COALESCE(p.partial_price, 0)
      END AS price,
      GREATEST(COALESCE(f.sort_date, '1970-01-01'::timestamp), COALESCE(p.sort_date, '1970-01-01'::timestamp)) AS sort_date
    FROM full_prices f
    FULL OUTER JOIN partial_prices p ON f.distributor_name = p.distributor_name
    WHERE COALESCE(f.full_price, 0) > 0 OR COALESCE(p.partial_price, 0) > 0
  ),
  
  -- Step 7: Build final result
  final_result AS (
    SELECT 
      COALESCE(ni.ndc_code, (SELECT ndc_code FROM combined_distributors LIMIT 1)) AS ndc_original,
      v_search_normalized AS ndc_normalized,
      COALESCE(ni.product_name, (SELECT product_name FROM combined_distributors WHERE product_name IS NOT NULL LIMIT 1)) AS product_name,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', cd.distributor_id,
            'name', cd.distributor_name,
            'fullPrice', cd.full_price,
            'partialPrice', cd.partial_price,
            'email', cd.contact_email,
            'phone', cd.contact_phone,
            'location', CASE 
              WHEN cd.address IS NOT NULL THEN 
                CONCAT_WS(', ', cd.address->>'city', cd.address->>'state')
              ELSE NULL 
            END,
            'reportDate', cd.sort_date
          ) ORDER BY cd.price DESC NULLS LAST
        ), '[]'::jsonb)
        FROM combined_distributors cd
      ) AS distributors,
      (SELECT COALESCE(MAX(full_price), 0) FROM combined_distributors) AS best_full_price,
      (SELECT COALESCE(MAX(partial_price), 0) FROM combined_distributors) AS best_partial_price
    FROM ndc_info ni
    RIGHT JOIN (SELECT 1) dummy ON TRUE
    LIMIT 1
  )
  
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM combined_distributors) THEN
        jsonb_agg(
          jsonb_build_object(
            'ndc', fr.ndc_original,
            'ndcNormalized', fr.ndc_normalized,
            'productName', fr.product_name,
            'distributors', fr.distributors,
            'bestFullPrice', fr.best_full_price,
            'bestPartialPrice', fr.best_partial_price,
            'recommendedDistributor', COALESCE((fr.distributors->0->>'name'), ''),
            'recommendedDistributorId', (fr.distributors->0->>'id'),
            'fullPricePerUnit', fr.best_full_price,
            'partialPricePerUnit', fr.best_partial_price,
            'alternativeDistributors', COALESCE(
              (SELECT jsonb_agg(d) FROM jsonb_array_elements(fr.distributors) d OFFSET 1),
              '[]'::jsonb
            )
          )
        )
      ELSE '[]'::jsonb
    END,
    CASE WHEN EXISTS (SELECT 1 FROM combined_distributors) THEN 1 ELSE 0 END
  INTO v_results, v_count
  FROM final_result fr;
  
  RETURN jsonb_build_object(
    'results', COALESCE(v_results, '[]'::jsonb),
    'count', COALESCE(v_count, 0),
    'searchTerm', p_search
  );
END;
$$;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION search_ndc_pricing TO authenticated;

