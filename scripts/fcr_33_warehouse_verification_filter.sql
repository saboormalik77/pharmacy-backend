-- ============================================================
-- FCR-33: Warehouse Verification Filter
-- ============================================================
-- Adds verification status filtering to warehouse receiving page
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Update warehouse_list_received to include verification filter
-- ────────────────────────────────────────────────────────────

-- Drop existing function first to avoid signature conflicts
DROP FUNCTION IF EXISTS warehouse_list_received(TEXT, INTEGER, INTEGER);

-- Create new function with verification filter parameter
CREATE OR REPLACE FUNCTION warehouse_list_received(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20,
  p_verification_status TEXT DEFAULT NULL  -- 'verified', 'unverified', or NULL (all)
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_results  jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count total matching records
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
       OR (p_verification_status = 'verified' AND rt.verified_integrity = true)
       OR (p_verification_status = 'unverified' AND rt.verified_integrity = false)
     );

  -- Get paginated results
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
           OR (p_verification_status = 'verified' AND rt.verified_integrity = true)
           OR (p_verification_status = 'unverified' AND rt.verified_integrity = false)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION warehouse_list_received TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION warehouse_list_received(TEXT, INTEGER, INTEGER, TEXT) IS 'List received returns with optional verification status filter (verified, unverified, or all)';