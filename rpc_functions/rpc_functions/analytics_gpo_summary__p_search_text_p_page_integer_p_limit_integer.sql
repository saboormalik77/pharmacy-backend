-- Function : analytics_gpo_summary
-- Arguments: p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_gpo_summary(p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_gpo_summary(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count distinct GPOs
  SELECT COUNT(DISTINCT COALESCE(ph.gpo_affiliation, 'No GPO')) INTO v_total
  FROM pharmacy ph
  WHERE EXISTS (SELECT 1 FROM return_transactions rt WHERE rt.pharmacy_id = ph.id)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Data rows grouped by GPO
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_value DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'gpoName',            COALESCE(ph.gpo_affiliation, 'No GPO'),
      'pharmacyCount',      COUNT(DISTINCT rt.pharmacy_id),
      'totalReturns',       COUNT(*),
      'totalItems',         COALESCE(SUM(rt.total_items), 0),
      'totalReturnableValue', COALESCE(SUM(rt.total_returnable_value), 0),
      'avgReturnValue',     ROUND(COALESCE(AVG(rt.total_returnable_value), 0), 2),
      'totalPayout',        COALESCE((
        SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp
        JOIN pharmacy p2 ON p2.id = pp.pharmacy_id
        WHERE COALESCE(p2.gpo_affiliation, 'No GPO') = COALESCE(ph.gpo_affiliation, 'No GPO')
          AND pp.status = 'paid'
      ), 0),
      'totalGpoShare',      COALESCE((
        SELECT SUM(pp.gpo_share) FROM pharmacy_payments pp
        JOIN pharmacy p2 ON p2.id = pp.pharmacy_id
        WHERE COALESCE(p2.gpo_affiliation, 'No GPO') = COALESCE(ph.gpo_affiliation, 'No GPO')
      ), 0)
    ) AS row_data,
    COALESCE(SUM(rt.total_returnable_value), 0) AS total_value
    FROM return_transactions rt
    JOIN pharmacy ph ON ph.id = rt.pharmacy_id
    WHERE p_search IS NULL OR (
      LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
    )
    GROUP BY COALESCE(ph.gpo_affiliation, 'No GPO')
    ORDER BY total_value DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$function$;
