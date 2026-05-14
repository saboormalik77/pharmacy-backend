-- Function : analytics_outstanding_ra
-- Arguments: p_destination text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_outstanding_ra(p_destination text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_outstanding_ra(p_destination text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
  v_summary  jsonb;
  v_aging    jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Summary
  SELECT jsonb_build_object(
    'totalOutstanding',   COUNT(*),
    'totalAskValue',      COALESCE(SUM(dm.amount_requested), 0),
    'avgDaysWaiting',     ROUND(COALESCE(AVG(
      EXTRACT(DAY FROM (NOW() - dm.ra_requested_at))
    ), 0), 0),
    'oldestRequest',      MIN(dm.ra_requested_at)
  )
  INTO v_summary
  FROM debit_memos dm
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Aging buckets
  SELECT jsonb_build_object(
    'under30Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) < 30),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) < 30), 0)
    ),
    'days30to60', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 30 AND 60),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 30 AND 60), 0)
    ),
    'days61to120', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 61 AND 120),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 61 AND 120), 0)
    ),
    'over120Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) > 120),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) > 120), 0)
    )
  )
  INTO v_aging
  FROM debit_memos dm
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Count
  SELECT COUNT(*) INTO v_total
  FROM debit_memos dm
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data ORDER BY days_waiting DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',              dm.id,
      'memoNumber',      dm.memo_number,
      'labelerName',     dm.labeler_name,
      'labelerId',       dm.labeler_id,
      'destination',     dm.destination,
      'pharmacyName',    COALESCE(ph.pharmacy_name, ''),
      'totalItems',      dm.total_items,
      'amountRequested', dm.amount_requested,
      'raRequestedAt',   dm.ra_requested_at,
      'ticklerDate',     dm.tickler_date,
      'daysWaiting',     EXTRACT(DAY FROM (NOW() - dm.ra_requested_at))::integer,
      'batchName',       rb.batch_name
    ) AS row_data,
    EXTRACT(DAY FROM (NOW() - dm.ra_requested_at))::integer AS days_waiting
    FROM debit_memos dm
    LEFT JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE dm.ra_requested_at IS NOT NULL
      AND dm.ra_received_at IS NULL
      AND (p_destination IS NULL OR dm.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY dm.ra_requested_at ASC
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
