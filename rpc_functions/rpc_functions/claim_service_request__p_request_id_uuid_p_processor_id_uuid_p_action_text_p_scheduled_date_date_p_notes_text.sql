-- Function : claim_service_request
-- Arguments: p_request_id uuid, p_processor_id uuid, p_action text, p_scheduled_date date, p_notes text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.claim_service_request(p_request_id uuid, p_processor_id uuid, p_action text, p_scheduled_date date, p_notes text) CASCADE;

CREATE OR REPLACE FUNCTION public.claim_service_request(p_request_id uuid, p_processor_id uuid, p_action text, p_scheduled_date date, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_request     service_requests%ROWTYPE;
    v_is_eligible BOOLEAN;
BEGIN
    IF p_action NOT IN ('schedule','complete','cancel','release') THEN
        RAISE EXCEPTION 'Invalid action: %', p_action USING ERRCODE = '22023';
    END IF;

    -- Row-level lock: holds until commit, blocks concurrent writes
    SELECT * INTO v_request
    FROM service_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found' USING ERRCODE = '02000';
    END IF;

    -- Eligibility: processor MUST be in the assignment list
    SELECT EXISTS (
        SELECT 1 FROM service_request_assignments
        WHERE service_request_id = p_request_id
          AND processor_id = p_processor_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'You are not assigned to this service request' USING ERRCODE = '42501';
    END IF;

    -- If already claimed by someone else → block every action
    IF v_request.claimed_by_processor_id IS NOT NULL
       AND v_request.claimed_by_processor_id <> p_processor_id THEN
        RAISE EXCEPTION 'This request has already been claimed by another processor'
            USING ERRCODE = '55000';
    END IF;

    -- ---- action: schedule ---------------------------------------------
    IF p_action = 'schedule' THEN
        IF v_request.status NOT IN ('pending','scheduled') THEN
            RAISE EXCEPTION 'Cannot schedule a request with status: %', v_request.status
                USING ERRCODE = '55000';
        END IF;
        IF p_scheduled_date IS NULL THEN
            RAISE EXCEPTION 'scheduled_date is required for schedule action'
                USING ERRCODE = '22023';
        END IF;

        UPDATE service_requests SET
            claimed_by_processor_id = p_processor_id,
            claimed_at              = COALESCE(claimed_at, NOW()),
            status                  = 'scheduled',
            scheduled_date          = p_scheduled_date,
            scheduler_notes         = NULLIF(TRIM(COALESCE(p_notes, '')), '')
        WHERE id = p_request_id;

        -- Notify pharmacy that their request has been scheduled
        BEGIN
            INSERT INTO pharmacy_notifications (
                pharmacy_id, type, title, message,
                entity_type, entity_id, metadata
            )
            SELECT
                v_request.pharmacy_id,
                'service_request_scheduled',
                'Service request scheduled',
                'Your on-site service request has been scheduled for '
                    || to_char(p_scheduled_date, 'Mon DD, YYYY')
                    || CASE WHEN pr.name IS NOT NULL THEN ' by ' || pr.name ELSE '' END
                    || '.',
                'service_request',
                p_request_id,
                jsonb_build_object(
                    'processor_id',   p_processor_id,
                    'processor_name', pr.name,
                    'scheduled_date', p_scheduled_date,
                    'purpose',        v_request.purpose,
                    'notes',          NULLIF(TRIM(COALESCE(p_notes, '')), '')
                )
            FROM processors pr
            WHERE pr.id = p_processor_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

    -- ---- action: complete ---------------------------------------------
    ELSIF p_action = 'complete' THEN
        IF v_request.status <> 'scheduled' THEN
            RAISE EXCEPTION 'Only scheduled requests can be completed'
                USING ERRCODE = '55000';
        END IF;
        IF v_request.claimed_by_processor_id IS NULL
           OR v_request.claimed_by_processor_id <> p_processor_id THEN
            RAISE EXCEPTION 'Only the claiming processor can complete this request'
                USING ERRCODE = '42501';
        END IF;

        UPDATE service_requests SET
            status           = 'completed',
            completed_at     = NOW(),
            completion_notes = NULLIF(TRIM(COALESCE(p_notes, '')), '')
        WHERE id = p_request_id;

        -- Notify pharmacy that their request has been completed
        BEGIN
            INSERT INTO pharmacy_notifications (
                pharmacy_id, type, title, message,
                entity_type, entity_id, metadata
            )
            SELECT
                v_request.pharmacy_id,
                'service_request_completed',
                'Service request completed',
                'Your on-site service request has been completed'
                    || CASE WHEN pr.name IS NOT NULL THEN ' by ' || pr.name ELSE '' END
                    || '.',
                'service_request',
                p_request_id,
                jsonb_build_object(
                    'processor_id',   p_processor_id,
                    'processor_name', pr.name,
                    'completed_at',   NOW(),
                    'purpose',        v_request.purpose,
                    'notes',          NULLIF(TRIM(COALESCE(p_notes, '')), '')
                )
            FROM processors pr
            WHERE pr.id = p_processor_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

    -- ---- action: cancel -----------------------------------------------
    ELSIF p_action = 'cancel' THEN
        IF v_request.status IN ('completed','cancelled') THEN
            RAISE EXCEPTION 'Cannot cancel a % request', v_request.status
                USING ERRCODE = '55000';
        END IF;

        UPDATE service_requests SET
            status           = 'cancelled',
            cancelled_at     = NOW(),
            cancelled_reason = NULLIF(TRIM(COALESCE(p_notes, '')), ''),
            cancelled_by     = 'processor',
            cancelled_by_id  = p_processor_id
        WHERE id = p_request_id;

        -- Notify pharmacy that their request has been cancelled by processor
        BEGIN
            INSERT INTO pharmacy_notifications (
                pharmacy_id, type, title, message,
                entity_type, entity_id, metadata
            )
            SELECT
                v_request.pharmacy_id,
                'service_request_cancelled',
                'Service request cancelled',
                'Your on-site service request has been cancelled'
                    || CASE WHEN pr.name IS NOT NULL THEN ' by ' || pr.name ELSE ' by your field representative' END
                    || CASE WHEN NULLIF(TRIM(COALESCE(p_notes, '')), '') IS NOT NULL 
                           THEN '. Reason: ' || TRIM(COALESCE(p_notes, '')) 
                           ELSE '.' END,
                'service_request',
                p_request_id,
                jsonb_build_object(
                    'processor_id',     p_processor_id,
                    'processor_name',   pr.name,
                    'cancelled_at',     NOW(),
                    'cancelled_by',     'processor',
                    'purpose',          v_request.purpose,
                    'reason',           NULLIF(TRIM(COALESCE(p_notes, '')), '')
                )
            FROM processors pr
            WHERE pr.id = p_processor_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

    -- ---- action: release ----------------------------------------------
    ELSIF p_action = 'release' THEN
        IF v_request.status <> 'scheduled' THEN
            RAISE EXCEPTION 'Only scheduled requests can be released'
                USING ERRCODE = '55000';
        END IF;
        IF v_request.claimed_by_processor_id IS NULL
           OR v_request.claimed_by_processor_id <> p_processor_id THEN
            RAISE EXCEPTION 'Only the claiming processor can release this request'
                USING ERRCODE = '42501';
        END IF;

        UPDATE service_requests SET
            status                  = 'pending',
            claimed_by_processor_id = NULL,
            claimed_at              = NULL,
            scheduled_date          = NULL,
            scheduler_notes         = NULL
        WHERE id = p_request_id;
    END IF;

    RETURN (SELECT to_jsonb(sr.*) FROM service_requests sr WHERE sr.id = p_request_id);
END;
$function$;
