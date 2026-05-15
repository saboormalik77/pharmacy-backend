-- Function : analytics_pharmacy_performance
-- Arguments: p_search text, p_sort_by text, p_sort_dir text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_pharmacy_performance(p_search text, p_sort_by text, p_sort_dir text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_pharmacy_performance(p_search text DEFAULT NULL::text, p_sort_by text DEFAULT 'totalValue'::text, p_sort_dir text DEFAULT 'desc'::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_rows    jsonb;
  v_overall jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Overall totals
  SELECT jsonb_build_object(
    'totalPharmacies',      COUNT(DISTINCT rt.pharmacy_id),
    'totalReturns',         COUNT(*),
    'totalReturnableValue', COALESCE(SUM(rt.total_returnable_value), 0),
    'totalItems',           COALESCE(SUM(rt.total_items), 0),
    'totalPayout',          COALESCE((
      SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp WHERE pp.status = 'paid'
    ), 0)
  )
  INTO v_overall
  FROM return_transactions rt;

  -- Count pharmacies with returns
  SELECT COUNT(DISTINCT sub.pharmacy_id) INTO v_total
  FROM (
    SELECT rt.pharmacy_id
    FROM return_transactions rt
    JOIN pharmacy ph ON ph.id = rt.pharmacy_id
    WHERE p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    )
    GROUP BY rt.pharmacy_id
  ) sub;

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'pharmacyId',     agg.pharmacy_id,
      'pharmacyName',   agg.pharmacy_name,
      'storeNumber',    agg.store_number,
      'gpoAffiliation', agg.gpo_affiliation,
      'serviceType',    agg.service_type,
      'totalReturns',   agg.total_returns,
      'totalItems',     agg.total_items,
      'totalReturnableValue', agg.total_returnable_value,
      'totalNonReturnableValue', agg.total_non_returnable_value,
      'avgReturnValue', agg.avg_return_value,
      'totalPayout',    agg.total_payout,
      'pendingPayout',  agg.pending_payout,
      'lastReturnDate', agg.last_return_date,
      'firstReturnDate', agg.first_return_date
    ) AS row_data,
    agg.total_returnable_value,
    agg.total_returns,
    agg.avg_return_value
    FROM (
      SELECT
        rt.pharmacy_id,
        MAX(ph.pharmacy_name) AS pharmacy_name,
        MAX(ph.store_number) AS store_number,
        MAX(ph.gpo_affiliation) AS gpo_affiliation,
        MAX(ph.service_type) AS service_type,
        COUNT(*) AS total_returns,
        COALESCE(SUM(rt.total_items), 0) AS total_items,
        COALESCE(SUM(rt.total_returnable_value), 0) AS total_returnable_value,
        COALESCE(SUM(rt.total_non_returnable_value), 0) AS total_non_returnable_value,
        ROUND(COALESCE(AVG(rt.total_returnable_value), 0), 2) AS avg_return_value,
        COALESCE((
          SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp
          WHERE pp.pharmacy_id = rt.pharmacy_id AND pp.status = 'paid'
        ), 0) AS total_payout,
        COALESCE((
          SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp
          WHERE pp.pharmacy_id = rt.pharmacy_id AND pp.status IN ('pending', 'processing')
        ), 0) AS pending_payout,
        MAX(rt.created_at) AS last_return_date,
        MIN(rt.created_at) AS first_return_date
      FROM return_transactions rt
      JOIN pharmacy ph ON ph.id = rt.pharmacy_id
      WHERE p_search IS NULL OR (
        LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
        OR ph.store_number = p_search
      )
      GROUP BY rt.pharmacy_id
    ) agg
    ORDER BY
      CASE WHEN p_sort_by = 'totalValue' AND p_sort_dir = 'desc' THEN agg.total_returnable_value END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'totalValue' AND p_sort_dir = 'asc'  THEN agg.total_returnable_value END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'returns'    AND p_sort_dir = 'desc' THEN agg.total_returns END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'returns'    AND p_sort_dir = 'asc'  THEN agg.total_returns END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'avgValue'   AND p_sort_dir = 'desc' THEN agg.avg_return_value END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'avgValue'   AND p_sort_dir = 'asc'  THEN agg.avg_return_value END ASC NULLS LAST,
      agg.total_returnable_value DESC NULLS LAST
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'overall', v_overall,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$function$;
