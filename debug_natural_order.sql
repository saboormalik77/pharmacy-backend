-- Check natural database order (no ORDER BY) for RxReturn Services LLC records
-- This should match what the optimization service gets initially

SELECT 
  rr.id,
  COALESCE(
    (rr.data->>'pricePerUnit')::DECIMAL,
    CASE 
      WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
        AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
      THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
      ELSE 0 
    END
  ) AS price_per_unit,
  COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at) AS sort_date
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
  AND COALESCE((rr.data->>'full')::INTEGER, 0) > 0 
  AND COALESCE((rr.data->>'partial')::INTEGER, 0) = 0;
-- NO ORDER BY - this shows natural database order
