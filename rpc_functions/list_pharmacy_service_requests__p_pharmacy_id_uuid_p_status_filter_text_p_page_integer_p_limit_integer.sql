-- Function : list_pharmacy_service_requests
-- Arguments: p_pharmacy_id uuid, p_status_filter text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_pharmacy_service_requests(p_pharmacy_id uuid, p_status_filter text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_pharmacy_service_requests(p_pharmacy_id uuid, p_status_filter text, p_page integer, p_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_offset INTEGER;
    v_total  INTEGER;
    v_items  JSONB;
    v_limit  INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
    v_page   INTEGER := GREATEST(1, COALESCE(p_page, 1));
BEGIN
    v_offset := (v_page - 1) * v_limit;

    SELECT COUNT(*) INTO v_total
    FROM service_requests sr
    WHERE (sr.pharmacy_id = p_pharmacy_id OR sr.branch_id = p_pharmacy_id)
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter);

    SELECT COALESCE(jsonb_agg(item_row), '[]'::jsonb)
    INTO v_items
    FROM (
        SELECT
            sr.*,
            b.name AS branch_business_name,
            b.pharmacy_name AS branch_name,
            proc.name       AS claimed_processor_name,
            proc.email      AS claimed_processor_email,
            proc.phone      AS claimed_processor_phone
        FROM service_requests sr
        LEFT JOIN pharmacy   b    ON b.id   = sr.branch_id
        LEFT JOIN processors proc ON proc.id = sr.claimed_by_processor_id
        WHERE (sr.pharmacy_id = p_pharmacy_id OR sr.branch_id = p_pharmacy_id)
          AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
        ORDER BY sr.created_at DESC
        OFFSET v_offset
        LIMIT v_limit
    ) item_row;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'page',  v_page,
        'limit', v_limit
    );
END;
$function$;
