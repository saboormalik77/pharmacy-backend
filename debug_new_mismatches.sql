-- Debug the NEW mismatches after tiebreaker fix
-- RxReturn Services LLC and PharmaCredit Distributors now have different prices

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

  -- Date fields
  ud.report_date,
  ud.uploaded_at,
  rr.created_at,

  -- Convert to epoch milliseconds like JavaScript new Date().getTime()
  EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 AS js_timestamp_ms,

  -- Show what the global sort order would be with different tiebreakers
  ROW_NUMBER() OVER (ORDER BY 
    EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 DESC, 
    rr.created_at DESC, 
    rr.id ASC
  ) as sort_order_id_asc,
  
  ROW_NUMBER() OVER (ORDER BY 
    EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 DESC, 
    rr.created_at DESC, 
    rr.id DESC
  ) as sort_order_id_desc

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
  distributor_name,
  js_timestamp_ms DESC,
  rr.created_at DESC,
  rr.id ASC;
