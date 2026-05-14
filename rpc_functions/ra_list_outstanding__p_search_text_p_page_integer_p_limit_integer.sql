-- Function : ra_list_outstanding
-- Arguments: p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_list_outstanding(p_search text, p_page integer, p_limit integer) CASCADE;
DROP FUNCTION IF EXISTS public.ra_list_outstanding(p_search text, p_page integer, p_limit integer, uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_list_outstanding(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20, p_pharmacy_ids uuid[] DEFAULT NULL::uuid[])
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

  SELECT COUNT(*) INTO v_total
  FROM debit_memos d
  WHERE d.ra_status = 'requested'
    AND d.ra_received_at IS NULL
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR (p_pharmacy_ids IS NOT NULL AND d.pharmacy_id = ANY(p_pharmacy_ids))
    ));

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.tickler_date NULLS LAST, d.ra_requested_at), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.ra_status = 'requested'
      AND d.ra_received_at IS NULL
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR (p_pharmacy_ids IS NOT NULL AND d.pharmacy_id = ANY(p_pharmacy_ids))
      ))
    ORDER BY d.tickler_date NULLS LAST, d.ra_requested_at
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    )
  );
END;
$function$;
