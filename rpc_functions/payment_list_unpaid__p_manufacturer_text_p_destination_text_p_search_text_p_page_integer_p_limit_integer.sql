-- Function : payment_list_unpaid
-- Arguments: p_manufacturer text, p_destination text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.payment_list_unpaid(p_manufacturer text, p_destination text, p_search text, p_page integer, p_limit integer) CASCADE;
DROP FUNCTION IF EXISTS public.payment_list_unpaid(p_manufacturer text, p_destination text, p_search text, p_page integer, p_limit integer, uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.payment_list_unpaid(p_manufacturer text DEFAULT NULL::text, p_destination text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20, p_pharmacy_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
  v_total_outstanding DECIMAL(12,2);
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*), COALESCE(SUM(d.amount_requested - d.amount_received), 0)
    INTO v_total, v_total_outstanding
  FROM debit_memos d
  WHERE d.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
         OR d.labeler_id = p_manufacturer)
    AND (p_destination IS NULL OR d.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR (p_pharmacy_ids IS NOT NULL AND d.pharmacy_id = ANY(p_pharmacy_ids))
    ));

  SELECT COALESCE(jsonb_agg(
    _debit_memo_to_json(d) || jsonb_build_object(
      'daysOutstanding', EXTRACT(DAY FROM NOW() - COALESCE(d.ra_requested_at, d.created_at))::integer,
      'outstandingAmount', d.amount_requested - d.amount_received
    )
    ORDER BY COALESCE(d.ra_requested_at, d.created_at)
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.payment_status IN ('pending', 'partial')
      AND (p_manufacturer IS NULL OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
           OR d.labeler_id = p_manufacturer)
      AND (p_destination IS NULL OR d.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR (p_pharmacy_ids IS NOT NULL AND d.pharmacy_id = ANY(p_pharmacy_ids))
      ))
    ORDER BY COALESCE(d.ra_requested_at, d.created_at)
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', jsonb_build_object(
      'totalUnpaid', v_total,
      'totalOutstanding', v_total_outstanding
    )
  );
END;
$function$;
