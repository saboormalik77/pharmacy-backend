-- Function : admin_reassign_service_request
-- Arguments: p_request_id uuid, p_processor_ids uuid[]
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.admin_reassign_service_request(p_request_id uuid, p_processor_ids uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_reassign_service_request(p_request_id uuid, p_processor_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_request service_requests%ROWTYPE;
    v_added_processors JSONB;
BEGIN
    SELECT * INTO v_request FROM service_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found' USING ERRCODE = '02000';
    END IF;

    IF v_request.status IN ('completed','cancelled') THEN
        RAISE EXCEPTION 'Cannot reassign a % request', v_request.status USING ERRCODE = '55000';
    END IF;

    -- Clear any existing claim and reset to pending if it was scheduled by a now-unassigned processor
    UPDATE service_requests SET
        claimed_by_processor_id = NULL,
        claimed_at              = NULL,
        status                  = 'pending',
        scheduled_date          = NULL,
        scheduler_notes         = NULL
    WHERE id = p_request_id;

    -- Replace assignments with the admin-provided set
    DELETE FROM service_request_assignments WHERE service_request_id = p_request_id;

    IF p_processor_ids IS NOT NULL AND array_length(p_processor_ids, 1) > 0 THEN
        INSERT INTO service_request_assignments (service_request_id, processor_id)
        SELECT p_request_id, pid
        FROM unnest(p_processor_ids) pid
        JOIN processors p ON p.id = pid
        WHERE p.status = 'active'
        ON CONFLICT (service_request_id, processor_id) DO NOTHING;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'processor_id', p.id,
        'name',         p.name,
        'email',        p.email,
        'phone',        p.phone
    )), '[]'::jsonb)
    INTO v_added_processors
    FROM service_request_assignments sra
    JOIN processors p ON p.id = sra.processor_id
    WHERE sra.service_request_id = p_request_id;

    -- Notify the (new) assigned processors that admin handed this to them.
    BEGIN
        INSERT INTO processor_notifications (
            processor_id, type, title, message,
            entity_type, entity_id, metadata
        )
        SELECT
            sra.processor_id,
            'service_request_reassigned',
            'Service request reassigned to you',
            'An admin reassigned an on-site service request to you'
                || COALESCE(' for ' || ph.pharmacy_name, ' for ' || ph.name, '')
                || '.',
            'service_request',
            p_request_id,
            jsonb_build_object(
                'pharmacy_id',    v_request.pharmacy_id,
                'branch_id',      v_request.branch_id,
                'purpose',        v_request.purpose,
                'requested_date', v_request.requested_date,
                'pharmacy_name',  COALESCE(ph.pharmacy_name, ph.name)
            )
        FROM service_request_assignments sra
        LEFT JOIN pharmacy ph ON ph.id = COALESCE(v_request.branch_id, v_request.pharmacy_id)
        WHERE sra.service_request_id = p_request_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    RETURN (SELECT to_jsonb(sr.*) FROM service_requests sr WHERE sr.id = p_request_id)
           || jsonb_build_object('assigned_processors', v_added_processors);
END;
$function$;
