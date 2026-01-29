-- Show ALL records for RxReturn Services LLC and PharmaCredit Distributors
-- to understand the complete data set

SELECT 
  rr.id,
  TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )) AS distributor_name,
  COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_code,
  
  -- Price calculation
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
  
  -- Date fields
  ud.report_date,
  ud.uploaded_at,
  rr.created_at,
  
  -- JavaScript timestamp
  CASE 
    WHEN ud.report_date IS NOT NULL THEN EXTRACT(EPOCH FROM ud.report_date::TIMESTAMP WITH TIME ZONE) * 1000
    WHEN ud.uploaded_at IS NOT NULL THEN EXTRACT(EPOCH FROM ud.uploaded_at) * 1000
    WHEN rr.created_at IS NOT NULL THEN EXTRACT(EPOCH FROM rr.created_at) * 1000
    ELSE 0
  END AS js_timestamp_ms,
  
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
  )) IN ('RxReturn Services LLC', 'PharmaCredit Distributors')
  -- Show ALL records, not just FULL ones
ORDER BY 
  distributor_name,
  js_timestamp_ms DESC,
  rr.id ASC;
