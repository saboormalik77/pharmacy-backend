-- Function : list_admin_service_requests
-- Arguments: p_buying_group_id uuid, p_status_filter text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_admin_service_requests(p_buying_group_id uuid, p_status_filter text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_admin_service_requests(p_buying_group_id uuid, p_status_filter text, p_search text, p_page integer, p_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_offset INTEGER;
    v_total  INTEGER;
    v_items  JSONB;
    v_limit  INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
    v_page   INTEGER := GREATEST(1, COALESCE(p_page, 1));
    v_search TEXT    := NULLIF(TRIM(COALESCE(p_search, '')), '');
BEGIN
    v_offset := (v_page - 1) * v_limit;

    SELECT COUNT(*) INTO v_total
    FROM service_requests sr
    LEFT JOIN pharmacy p ON p.id = sr.pharmacy_id
    WHERE (p_buying_group_id IS NULL OR sr.buying_group_id = p_buying_group_id)
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
      AND (
          v_search IS NULL
          OR p.name ILIKE '%' || v_search || '%'
          OR p.pharmacy_name ILIKE '%' || v_search || '%'
          OR p.email         ILIKE '%' || v_search || '%'
      );

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
            'claimed_processor_name',  proc.name,
            'claimed_processor_email', proc.email,
            'assigned_processors', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'processor_id', pr.id,
                    'name',         pr.name,
                    'email',        pr.email,
                    'phone',        pr.phone
                )), '[]'::jsonb)
                FROM service_request_assignments sra
                JOIN processors pr ON pr.id = sra.processor_id
                WHERE sra.service_request_id = sr.id
            )
        ) AS item_row
        FROM service_requests sr
        LEFT JOIN pharmacy   p    ON p.id   = sr.pharmacy_id
        LEFT JOIN pharmacy   b    ON b.id   = sr.branch_id
        LEFT JOIN processors proc ON proc.id = sr.claimed_by_processor_id
        WHERE (p_buying_group_id IS NULL OR sr.buying_group_id = p_buying_group_id)
          AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
          AND (
              v_search IS NULL
              OR p.name ILIKE '%' || v_search || '%'
              OR p.pharmacy_name ILIKE '%' || v_search || '%'
              OR p.email         ILIKE '%' || v_search || '%'
          )
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
