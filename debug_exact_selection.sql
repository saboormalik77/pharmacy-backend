-- Debug query to understand EXACTLY which records the optimization service selects
-- Focus on the 2 problematic distributors with identical timestamps

SELECT
  rr.id,
  TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )) AS distributor_name,
  
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

  -- Date fields
  ud.report_date,
  ud.uploaded_at,
  rr.created_at,
  
  -- JavaScript timestamp
  EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 AS js_timestamp_ms,
  
  -- Different possible sort orders to test
  ROW_NUMBER() OVER (ORDER BY 
    EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 DESC, 
    rr.created_at DESC, 
    rr.id ASC
  ) as global_sort_id_asc,
  
  ROW_NUMBER() OVER (ORDER BY 
    EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 DESC, 
    rr.created_at ASC, 
    rr.id ASC
  ) as global_sort_created_asc,
  
  ROW_NUMBER() OVER (ORDER BY 
    EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 DESC, 
    ud.uploaded_at DESC,
    rr.id ASC
  ) as global_sort_uploaded_desc,
  
  -- What DISTINCT ON would pick with different orders
  ROW_NUMBER() OVER (PARTITION BY TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )) ORDER BY 
    EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 DESC, 
    rr.created_at DESC, 
    rr.id ASC
  ) as distinct_on_current,
  
  ROW_NUMBER() OVER (PARTITION BY TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )) ORDER BY 
    EXTRACT(EPOCH FROM COALESCE(ud.report_date::TIMESTAMP WITH TIME ZONE, ud.uploaded_at, rr.created_at)) * 1000 DESC, 
    rr.created_at ASC, 
    rr.id ASC
  ) as distinct_on_created_asc

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
