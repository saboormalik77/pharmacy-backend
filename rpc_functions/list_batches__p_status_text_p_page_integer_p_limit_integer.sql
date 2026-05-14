-- Function : list_batches
-- Arguments: p_status text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_batches(p_status text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_batches(p_status text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
    FROM return_batches
   WHERE (p_status IS NULL OR status = p_status);

  SELECT COALESCE(jsonb_agg(row_json ORDER BY batch_month DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _batch_to_json(b) AS row_json, b.batch_month
        FROM return_batches b
       WHERE (p_status IS NULL OR b.status = p_status)
       ORDER BY b.batch_month DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page',  p_page, 'limit', p_limit,
      'total', v_total, 'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$function$;
