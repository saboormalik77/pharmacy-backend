-- Function : get_service_request_detail
-- Arguments: p_request_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_service_request_detail(p_request_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_service_request_detail(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT
        to_jsonb(sr.*)
        || jsonb_build_object(
            'pharmacy', (
                SELECT jsonb_build_object(
                    'id',            p.id,
                    'business_name', p.name,
                    'pharmacy_name', p.pharmacy_name,
                    'email',         p.email,
                    'phone',         p.phone
                ) FROM pharmacy p WHERE p.id = sr.pharmacy_id
            ),
            'branch', (
                SELECT CASE WHEN sr.branch_id IS NULL THEN NULL ELSE
                    jsonb_build_object(
                        'id',            b.id,
                        'business_name', b.name,
                        'pharmacy_name', b.pharmacy_name
                    ) END
                FROM pharmacy b WHERE b.id = sr.branch_id
            ),
            'claimed_processor', (
                SELECT CASE WHEN sr.claimed_by_processor_id IS NULL THEN NULL ELSE
                    jsonb_build_object(
                        'processor_id', pr.id,
                        'name',         pr.name,
                        'email',        pr.email,
                        'phone',        pr.phone
                    ) END
                FROM processors pr WHERE pr.id = sr.claimed_by_processor_id
            ),
            'assigned_processors', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'processor_id', pr.id,
                    'name',         pr.name,
                    'email',        pr.email,
                    'phone',        pr.phone,
                    'status',       pr.status
                )), '[]'::jsonb)
                FROM service_request_assignments sra
                JOIN processors pr ON pr.id = sra.processor_id
                WHERE sra.service_request_id = sr.id
            )
        )
    INTO v_result
    FROM service_requests sr
    WHERE sr.id = p_request_id;

    RETURN v_result;
END;
$function$;
