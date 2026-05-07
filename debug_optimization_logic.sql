-- Debug: Simulate EXACT optimization service logic
-- This replicates the JavaScript sorting and "first match wins" logic

WITH all_records AS (
  SELECT 
    rr.id,
    TRIM(COALESCE(
      rd.name,
      rr.data->>'reverseDistributor',
      rr.data->'reverseDistributorInfo'->>'name',
      'Unknown Distributor'
    )) AS distributor_name,
    COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_code,
    
    -- Price calculation (same as both APIs)
    COALESCE(
      (rr.data->>'pricePerUnit')::DECIMAL,
      CASE 
        WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
          AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
        THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
        ELSE 0 
      END
    ) AS price_per_unit,
    
    -- Full/Partial counts
    COALESCE((rr.data->>'full')::INTEGER, 0) AS item_full,
    COALESCE((rr.data->>'partial')::INTEGER, 0) AS item_partial,
    
    -- Date fields - EXACT JavaScript logic
    ud.report_date,
    ud.uploaded_at,
    rr.created_at,
    
    -- JavaScript equivalent: dateA || dateB || dateC
    COALESCE(ud.report_date::TEXT, ud.uploaded_at::TEXT, rr.created_at::TEXT) AS js_date_string,
    
    -- Convert to epoch milliseconds like JavaScript new Date().getTime()
    CASE 
      WHEN ud.report_date IS NOT NULL THEN EXTRACT(EPOCH FROM ud.report_date::TIMESTAMP WITH TIME ZONE) * 1000
      WHEN ud.uploaded_at IS NOT NULL THEN EXTRACT(EPOCH FROM ud.uploaded_at) * 1000
      WHEN rr.created_at IS NOT NULL THEN EXTRACT(EPOCH FROM rr.created_at) * 1000
      ELSE 0
    END AS js_timestamp_ms
    
  FROM return_reports rr
  JOIN uploaded_documents ud ON rr.document_id = ud.id
  LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
  WHERE 
    LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) = '60219174802'
    AND TRIM(COALESCE(
      rd.name,
      rr.data->>'reverseDistributor',
      rr.data->'reverseDistributorInfo'->>'name',
      'Unknown Distributor'
    )) IN ('RxReturn Services LLC', 'PharmaCredit Distributors')
    -- Only FULL records
    AND COALESCE((rr.data->>'full')::INTEGER, 0) > 0 
    AND COALESCE((rr.data->>'partial')::INTEGER, 0) = 0
    AND COALESCE(
      (rr.data->>'pricePerUnit')::DECIMAL,
      CASE 
        WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
          AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
        THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
        ELSE 0 
      END
    ) > 0
),

-- Step 1: Sort ALL records like JavaScript does (lines 1904-1910)
sorted_records AS (
  SELECT *,
    ROW_NUMBER() OVER (ORDER BY js_timestamp_ms DESC, id) as sort_order
  FROM all_records
),

-- Step 2: Apply "first match wins" logic per distributor (lines 753, 758)
first_match_per_distributor AS (
  SELECT DISTINCT ON (distributor_name)
    distributor_name,
    price_per_unit,
    js_timestamp_ms,
    js_date_string,
    id,
    sort_order
  FROM sorted_records
  ORDER BY distributor_name, sort_order ASC  -- First in sorted order wins
)

SELECT 
  distributor_name,
  price_per_unit AS optimization_should_pick,
  js_date_string,
  js_timestamp_ms,
  id,
  sort_order
FROM first_match_per_distributor
ORDER BY distributor_name;
