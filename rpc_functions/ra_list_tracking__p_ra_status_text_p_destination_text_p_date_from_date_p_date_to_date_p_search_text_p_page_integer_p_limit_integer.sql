-- Function : ra_list_tracking
-- Arguments: p_ra_status text, p_destination text, p_date_from date, p_date_to date, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_list_tracking(p_ra_status text, p_destination text, p_date_from date, p_date_to date, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_list_tracking(p_ra_status text DEFAULT NULL::text, p_destination text DEFAULT NULL::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
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
  WHERE (p_ra_status IS NULL OR d.ra_status = p_ra_status)
    AND (p_destination IS NULL OR d.destination = p_destination)
    AND (p_date_from IS NULL OR d.ra_requested_at >= p_date_from)
    AND (p_date_to IS NULL OR d.ra_requested_at <= (p_date_to + INTERVAL '1 day'))
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.ra_number, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE (p_ra_status IS NULL OR d.ra_status = p_ra_status)
      AND (p_destination IS NULL OR d.destination = p_destination)
      AND (p_date_from IS NULL OR d.ra_requested_at >= p_date_from)
      AND (p_date_to IS NULL OR d.ra_requested_at <= (p_date_to + INTERVAL '1 day'))
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.ra_number, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY d.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page',       p_page,
      'limit',      p_limit,
      'total',      v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', jsonb_build_object(
      'pending',   (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'pending'),
      'requested', (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'requested'),
      'received',  (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'received'),
      'shipped',   (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'shipped'),
      'overdue',   (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'overdue'
                     OR (ra_status = 'requested' AND tickler_date IS NOT NULL AND tickler_date < CURRENT_DATE))
    )
  );
END;
$function$;
