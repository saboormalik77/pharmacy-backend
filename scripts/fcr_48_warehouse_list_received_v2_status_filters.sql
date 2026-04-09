-- ============================================================
-- FCR-48: warehouse_list_received — v2 verification tab filters
-- ============================================================
-- The admin / portal UI sends verificationStatus:
--   not_started | in_progress | completed
-- alongside legacy values:
--   verified | unverified  (verified_integrity on return_transactions)
--
-- Requires: return_transactions.verification_completed_at (FCR-47).
-- ============================================================

DROP FUNCTION IF EXISTS warehouse_list_received(TEXT, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION warehouse_list_received(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20,
  p_verification_status TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_results  jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
    FROM return_transactions rt
   WHERE rt.status IN ('received', 'verified', 'closed', 'closed_out')
     AND (
       p_search IS NULL
       OR rt.license_plate   ILIKE '%' || p_search || '%'
       OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
       OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                  AND p.pharmacy_name ILIKE '%' || p_search || '%')
     )
     AND (
       p_verification_status IS NULL
       OR (
         p_verification_status = 'verified'
         AND rt.verified_integrity = true
       )
       OR (
         p_verification_status = 'unverified'
         AND rt.verified_integrity = false
       )
       OR (
         p_verification_status = 'not_started'
         AND rt.status = 'received'
         AND rt.verification_completed_at IS NULL
         AND rt.verified_at IS NULL
       )
       OR (
         p_verification_status = 'in_progress'
         AND rt.status = 'received'
         AND rt.verification_completed_at IS NULL
         AND rt.verified_at IS NOT NULL
         AND COALESCE(rt.verified_integrity, false) = false
       )
       OR (
         p_verification_status = 'completed'
         AND (
           rt.verification_completed_at IS NOT NULL
           OR rt.status IN ('verified', 'closed', 'closed_out')
           OR (rt.status = 'received' AND rt.verified_integrity = true)
         )
       )
     );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY received_in_warehouse_date DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _rt_to_json(rt) AS row_json, rt.received_in_warehouse_date
        FROM return_transactions rt
       WHERE rt.status IN ('received', 'verified', 'closed', 'closed_out')
         AND (
           p_search IS NULL
           OR rt.license_plate   ILIKE '%' || p_search || '%'
           OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
           OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                      AND p.pharmacy_name ILIKE '%' || p_search || '%')
         )
         AND (
           p_verification_status IS NULL
           OR (
             p_verification_status = 'verified'
             AND rt.verified_integrity = true
           )
           OR (
             p_verification_status = 'unverified'
             AND rt.verified_integrity = false
           )
           OR (
             p_verification_status = 'not_started'
             AND rt.status = 'received'
             AND rt.verification_completed_at IS NULL
             AND rt.verified_at IS NULL
           )
           OR (
             p_verification_status = 'in_progress'
             AND rt.status = 'received'
             AND rt.verification_completed_at IS NULL
             AND rt.verified_at IS NOT NULL
             AND COALESCE(rt.verified_integrity, false) = false
           )
           OR (
             p_verification_status = 'completed'
             AND (
               rt.verification_completed_at IS NOT NULL
               OR rt.status IN ('verified', 'closed', 'closed_out')
               OR (rt.status = 'received' AND rt.verified_integrity = true)
             )
           )
         )
       ORDER BY rt.received_in_warehouse_date DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::DECIMAL / p_limit)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION warehouse_list_received(TEXT, INTEGER, INTEGER, TEXT) TO authenticated, anon, service_role;

COMMENT ON FUNCTION warehouse_list_received(TEXT, INTEGER, INTEGER, TEXT) IS
  'List received returns. p_verification_status: NULL=all; verified|unverified (legacy integrity); not_started|in_progress|completed (v2 warehouse verification UI).';
