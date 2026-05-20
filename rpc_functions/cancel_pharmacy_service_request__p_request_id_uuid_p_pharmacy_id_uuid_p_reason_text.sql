-- Function : cancel_pharmacy_service_request
-- Arguments: p_request_id uuid, p_pharmacy_id uuid, p_reason text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.cancel_pharmacy_service_request(p_request_id uuid, p_pharmacy_id uuid, p_reason text) CASCADE;

CREATE OR REPLACE FUNCTION public.cancel_pharmacy_service_request(p_request_id uuid, p_pharmacy_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status
    FROM service_requests
    WHERE id = p_request_id
      AND (pharmacy_id = p_pharmacy_id OR branch_id = p_pharmacy_id)
    FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Service request not found or access denied' USING ERRCODE = '02000';
    END IF;

    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending requests can be cancelled' USING ERRCODE = '55000';
    END IF;

    UPDATE service_requests SET
        status           = 'cancelled',
        cancelled_at     = NOW(),
        cancelled_reason = NULLIF(TRIM(COALESCE(p_reason, '')), ''),
        cancelled_by     = 'pharmacy',
        cancelled_by_id  = p_pharmacy_id
    WHERE id = p_request_id;

    -- Notify every assigned processor that the pharmacy cancelled.
    BEGIN
        INSERT INTO processor_notifications (
            processor_id, type, title, message,
            entity_type, entity_id, metadata
        )
        SELECT
            sra.processor_id,
            'service_request_cancelled',
            'Service request cancelled',
            COALESCE(ph.pharmacy_name, ph.name, 'The pharmacy')
                || ' cancelled their on-site service request.',
            'service_request',
            p_request_id,
            jsonb_build_object(
                'pharmacy_id',    p_pharmacy_id,
                'cancelled_by',   'pharmacy',
                'reason',         NULLIF(TRIM(COALESCE(p_reason, '')), ''),
                'pharmacy_name',  COALESCE(ph.pharmacy_name, ph.name)
            )
        FROM service_request_assignments sra
        LEFT JOIN service_requests sr ON sr.id = p_request_id
        LEFT JOIN pharmacy ph ON ph.id = COALESCE(sr.branch_id, sr.pharmacy_id)
        WHERE sra.service_request_id = p_request_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    RETURN (SELECT to_jsonb(sr.*) FROM service_requests sr WHERE sr.id = p_request_id);
END;
$function$;
