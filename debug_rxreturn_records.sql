-- Debug query to see all RxReturn Services LLC records for NDC 60219-1748-02
-- This will help us understand why the two APIs pick different prices

SELECT 
  rr.id,
  TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )) AS distributor_name,
  COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_code,
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) AS ndc_normalized,
  
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
  
  -- Date fields for sorting
  ud.report_date,
  ud.uploaded_at,
  rr.created_at,
  COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at) AS sort_date,
  
  -- Raw data for debugging
  rr.data->>'creditAmount' AS raw_credit,
  rr.data->>'quantity' AS raw_quantity,
  rr.data->>'pricePerUnit' AS raw_price_per_unit
  
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
  )) = 'RxReturn Services LLC'
  -- Only FULL records (same filter as both APIs)
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
ORDER BY 
  sort_date DESC NULLS LAST,  -- Same sorting as optimization service
  rr.id ASC;  -- Tiebreaker to see database order
