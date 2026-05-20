-- Function : search_ndc_pricing_v3
-- Arguments: p_search text, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.search_ndc_pricing_v3(p_search text, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.search_ndc_pricing_v3(p_search text, p_limit integer DEFAULT 50)
 RETURNS TABLE(ndc text, product_name text, distributor_id uuid, distributor_name text, contact_email text, contact_phone text, address text, full_price numeric, partial_price numeric, report_date timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_search_normalized TEXT;
BEGIN
  -- Normalize search term (remove dashes, convert to lowercase)
  v_search_normalized := LOWER(REPLACE(TRIM(p_search), '-', ''));
  
  RETURN QUERY
  WITH all_reports_unfiltered AS (
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
  
  -- Step 2: Sort ALL records like JavaScript does (lines 341-352)
  all_reports_sorted AS (
    SELECT *
    FROM all_reports_unfiltered
    ORDER BY sort_date_ms DESC, created_at DESC, id ASC
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
    WHERE item_full > 0 AND item_partial = 0  -- isFullRecord check (line 750)
      AND price_per_unit > 0  -- Only valid prices (line 702)
    ORDER BY distributor_name, sort_date_ms DESC, created_at DESC, id ASC
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
    WHERE item_partial > 0 AND item_full = 0  -- isPartialRecord check (line 751)
      AND price_per_unit > 0  -- Only valid prices
    ORDER BY distributor_name, sort_date_ms DESC, created_at DESC, id ASC
  ),
  
  -- Step 6: Combine full and partial prices per distributor
  combined_prices AS (
    SELECT 
      COALESCE(fp.distributor_name, pp.distributor_name) AS distributor_name,
      COALESCE(fp.distributor_id, pp.distributor_id) AS distributor_id,
      COALESCE(fp.contact_email, pp.contact_email) AS contact_email,
      COALESCE(fp.contact_phone, pp.contact_phone) AS contact_phone,
      COALESCE(fp.address, pp.address) AS address,
      COALESCE(fp.ndc_code, pp.ndc_code) AS ndc_code,
      COALESCE(fp.ndc_normalized, pp.ndc_normalized) AS ndc_normalized,
      COALESCE(fp.product_name, pp.product_name) AS product_name,
      COALESCE(fp.full_price, 0) AS full_price,
      COALESCE(pp.partial_price, 0) AS partial_price,
      COALESCE(fp.sort_date, pp.sort_date) AS sort_date
    FROM full_prices fp
    FULL OUTER JOIN partial_prices pp ON fp.distributor_name = pp.distributor_name
  )
  
  -- Step 7: Return results with final price selection logic (lines 1051-1059)
  SELECT 
    cp.ndc_code AS ndc,
    cp.product_name,
    cp.distributor_id,
    cp.distributor_name,
    cp.contact_email,
    cp.contact_phone,
    cp.address,
    cp.full_price,
    cp.partial_price,
    cp.sort_date AS report_date
  FROM combined_prices cp
  WHERE cp.distributor_name IS NOT NULL
    AND (cp.full_price > 0 OR cp.partial_price > 0)
  ORDER BY 
    -- Sort by best price (optimization service uses fullPrice > 0 ? fullPrice : partialPrice)
    CASE 
      WHEN cp.full_price > 0 THEN cp.full_price 
      ELSE cp.partial_price 
    END DESC
  LIMIT p_limit;
END;
$function$;
