-- Function : analytics_unpaid_memos
-- Arguments: p_manufacturer text, p_destination text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_unpaid_memos(p_manufacturer text, p_destination text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_unpaid_memos(p_manufacturer text DEFAULT NULL::text, p_destination text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_rows    jsonb;
  v_summary jsonb;
  v_aging   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Summary
  SELECT jsonb_build_object(
    'totalUnpaidMemos',     COUNT(*),
    'totalAmountRequested', COALESCE(SUM(dm.amount_requested), 0),
    'totalAmountReceived',  COALESCE(SUM(dm.amount_received), 0),
    'totalOutstanding',     COALESCE(SUM(dm.amount_requested - dm.amount_received), 0),
    'avgDaysOutstanding',   ROUND(COALESCE(AVG(
      EXTRACT(DAY FROM (NOW() - dm.created_at))
    ), 0), 0)
  )
  INTO v_summary
  FROM debit_memos dm
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Aging buckets
  SELECT jsonb_build_object(
    'under30Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) < 30),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) < 30), 0)
    ),
    'days30to90', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 30 AND 90),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 30 AND 90), 0)
    ),
    'days91to180', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 91 AND 180),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 91 AND 180), 0)
    ),
    'days181to365', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 181 AND 365),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 181 AND 365), 0)
    ),
    'over365Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) > 365),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) > 365), 0)
    )
  )
  INTO v_aging
  FROM debit_memos dm
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Count
  SELECT COUNT(*) INTO v_total
  FROM debit_memos dm
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data ORDER BY days_outstanding DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',               dm.id,
      'memoNumber',       dm.memo_number,
      'labelerName',      dm.labeler_name,
      'labelerId',        dm.labeler_id,
      'destination',      dm.destination,
      'pharmacyName',     COALESCE(ph.pharmacy_name, ''),
      'totalItems',       dm.total_items,
      'amountRequested',  dm.amount_requested,
      'amountReceived',   dm.amount_received,
      'outstandingAmount',dm.amount_requested - dm.amount_received,
      'paymentStatus',    dm.payment_status,
      'daysOutstanding',  EXTRACT(DAY FROM (NOW() - dm.created_at))::integer,
      'batchName',        rb.batch_name,
      'raNumber',         dm.ra_number
    ) AS row_data,
    EXTRACT(DAY FROM (NOW() - dm.created_at))::integer AS days_outstanding
    FROM debit_memos dm
    LEFT JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE dm.payment_status IN ('pending', 'partial')
      AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
      AND (p_destination IS NULL OR dm.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY dm.created_at ASC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'summary', v_summary,
    'agingBuckets', v_aging,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$function$;
