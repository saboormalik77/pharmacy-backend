-- Function : warehouse_list_received
-- Arguments: p_search text, p_page integer, p_limit integer, p_verification_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_list_received(p_search text, p_page integer, p_limit integer, p_verification_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_list_received(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20, p_verification_status text DEFAULT NULL::text)
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
$function$;
