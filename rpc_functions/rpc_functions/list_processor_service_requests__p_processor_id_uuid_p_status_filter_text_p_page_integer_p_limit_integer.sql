-- Function : list_processor_service_requests
-- Arguments: p_processor_id uuid, p_status_filter text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_processor_service_requests(p_processor_id uuid, p_status_filter text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_processor_service_requests(p_processor_id uuid, p_status_filter text, p_page integer, p_limit integer)
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
    JOIN service_request_assignments sra ON sra.service_request_id = sr.id
    WHERE sra.processor_id = p_processor_id
      AND (
          sr.claimed_by_processor_id IS NULL
          OR sr.claimed_by_processor_id = p_processor_id
      )
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter);

    SELECT COALESCE(jsonb_agg(item_row ORDER BY (item_row->>'created_at') DESC), '[]'::jsonb)
    INTO v_items
    FROM (
        SELECT to_jsonb(sr.*) || jsonb_build_object(
            'pharmacy_business_name', p.name,
            'pharmacy_name',          p.pharmacy_name,
            'pharmacy_phone',         p.phone,
            'pharmacy_email',         p.email,
            'branch_business_name',   b.name,
            'branch_name',            b.pharmacy_name,
            'is_claimed_by_me',       (sr.claimed_by_processor_id = p_processor_id)
        ) AS item_row
        FROM service_requests sr
        JOIN service_request_assignments sra ON sra.service_request_id = sr.id
        LEFT JOIN pharmacy p ON p.id = sr.pharmacy_id
        LEFT JOIN pharmacy b ON b.id = sr.branch_id
        WHERE sra.processor_id = p_processor_id
          AND (
              sr.claimed_by_processor_id IS NULL
              OR sr.claimed_by_processor_id = p_processor_id
          )
          AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
        ORDER BY sr.created_at DESC
        OFFSET v_offset
        LIMIT v_limit
    ) q;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'page',  v_page,
        'limit', v_limit
    );
END;
$function$;
