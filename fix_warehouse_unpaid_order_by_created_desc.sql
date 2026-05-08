-- ============================================================
-- Fix: /warehouse/unpaid records should be in descending order
--      by creation/request date (newest first).
--
-- Root cause:
--   payment_list_unpaid RPC orders by
--   COALESCE(d.ra_requested_at, d.created_at) ASC (ascending).
--
-- Fix:
--   Add DESC to both ORDER BY clauses (inner subquery and the
--   outer jsonb_agg) so the newest records appear first.
--
-- Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.payment_list_unpaid(
  p_manufacturer TEXT DEFAULT NULL,
  p_destination  TEXT DEFAULT NULL,
  p_search       TEXT DEFAULT NULL,
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_offset             INTEGER;
  v_total              INTEGER;
  v_rows               jsonb;
  v_total_outstanding  DECIMAL(12,2);
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*), COALESCE(SUM(d.amount_requested - d.amount_received), 0)
    INTO v_total, v_total_outstanding
  FROM debit_memos d
  WHERE d.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL
         OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
         OR d.labeler_id = p_manufacturer)
    AND (p_destination IS NULL OR d.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), ''))
         LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(
    _debit_memo_to_json(d) || jsonb_build_object(
      'daysOutstanding', EXTRACT(DAY FROM NOW() - COALESCE(d.ra_requested_at, d.created_at))::integer,
      'outstandingAmount', d.amount_requested - d.amount_received
    )
    ORDER BY COALESCE(d.ra_requested_at, d.created_at) DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.payment_status IN ('pending', 'partial')
      AND (p_manufacturer IS NULL
           OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
           OR d.labeler_id = p_manufacturer)
      AND (p_destination IS NULL OR d.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), ''))
           LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY COALESCE(d.ra_requested_at, d.created_at) DESC
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
$$;

GRANT EXECUTE ON FUNCTION public.payment_list_unpaid(text, text, text, integer, integer)
  TO anon, authenticated, service_role;
