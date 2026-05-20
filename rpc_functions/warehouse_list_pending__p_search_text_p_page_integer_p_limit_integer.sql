-- Function : warehouse_list_pending
-- Arguments: p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_list_pending(p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_list_pending(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_results  jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
    FROM return_transactions rt
   WHERE rt.status IN ('finalized', 'scanning')
     AND rt.received_in_warehouse_date IS NULL
     AND (
       p_search IS NULL
       OR rt.license_plate   ILIKE '%' || p_search || '%'
       OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
       OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                  AND p.pharmacy_name ILIKE '%' || p_search || '%')
     );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _rt_to_json(rt) AS row_json, rt.created_at
        FROM return_transactions rt
       WHERE rt.status IN ('finalized', 'scanning')
         AND rt.received_in_warehouse_date IS NULL
         AND (
           p_search IS NULL
           OR rt.license_plate   ILIKE '%' || p_search || '%'
           OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
           OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                      AND p.pharmacy_name ILIKE '%' || p_search || '%')
         )
       ORDER BY rt.created_at DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page',       p_page,
      'limit',      p_limit,
      'total',      v_total,
      'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$function$;
