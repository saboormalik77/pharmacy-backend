-- ============================================================================
-- Dedupe create_service_request RPC overloads (run in Supabase SQL editor once)
-- ============================================================================
-- PostgREST error: "Could not choose the best candidate function between ..."
-- happens when two PostgreSQL functions share the same name but different
-- parameter ORDER (e.g. branch before date vs date before branch).
-- This drops all variants and keeps ONE canonical signature aligned with
-- src/services/serviceRequestService.ts (p_pharmacy_id, p_requested_date, p_branch_id, …).
--
-- Buying group: pharmacy.created_by (admin id) — public.pharmacy has no buying_group_id column.
-- Body matches sqlTable/service_requests.sql plus SECURITY DEFINER for RPC.
-- ============================================================================

DROP FUNCTION IF EXISTS create_service_request(uuid, date, uuid, text, text);
DROP FUNCTION IF EXISTS create_service_request(uuid, date, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS create_service_request(uuid, uuid, date, text, text);
DROP FUNCTION IF EXISTS create_service_request(uuid, uuid, date, text, text, uuid);

CREATE OR REPLACE FUNCTION create_service_request(
    p_pharmacy_id UUID,
    p_requested_date DATE,
    p_branch_id UUID DEFAULT NULL,
    p_purpose TEXT DEFAULT NULL,
    p_special_instructions TEXT DEFAULT NULL,
    p_requested_by_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id             UUID;
    v_effective_pharmacy_id  UUID;
    v_buying_group_id        UUID;
    v_parent_id              UUID;
    v_assigned_count         INTEGER := 0;
    v_request_row            JSONB;
    v_assigned_processors    JSONB;
BEGIN
    IF p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id is required' USING ERRCODE = '22023';
    END IF;
    IF p_requested_date IS NULL THEN
        RAISE EXCEPTION 'requested_date is required' USING ERRCODE = '22023';
    END IF;
    IF p_requested_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'requested_date cannot be in the past' USING ERRCODE = '22023';
    END IF;
    IF p_purpose IS NOT NULL AND p_purpose NOT IN
       ('return_pickup','training','inventory_review','destruction_pickup','other') THEN
        RAISE EXCEPTION 'Invalid purpose value' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(LENGTH(p_special_instructions), 0) > 2000 THEN
        RAISE EXCEPTION 'special_instructions cannot exceed 2000 characters' USING ERRCODE = '22023';
    END IF;

    v_effective_pharmacy_id := COALESCE(p_branch_id, p_pharmacy_id);

    SELECT
        COALESCE(ph.created_by, par.created_by),
        ph.parent_pharmacy_id
      INTO v_buying_group_id, v_parent_id
      FROM pharmacy ph
      LEFT JOIN pharmacy par ON par.id = ph.parent_pharmacy_id
     WHERE ph.id = v_effective_pharmacy_id;

    INSERT INTO service_requests (
        pharmacy_id, branch_id, requested_by_user_id, buying_group_id,
        requested_date, purpose, special_instructions, status
    ) VALUES (
        p_pharmacy_id, p_branch_id, p_requested_by_user_id, v_buying_group_id,
        p_requested_date, p_purpose, NULLIF(TRIM(COALESCE(p_special_instructions, '')), ''),
        'pending'
    )
    RETURNING id INTO v_request_id;

    INSERT INTO service_request_assignments (service_request_id, processor_id)
    SELECT DISTINCT v_request_id, psa.processor_id
    FROM processor_store_assignments psa
    JOIN processors p ON p.id = psa.processor_id
    WHERE psa.pharmacy_id IN (
            v_effective_pharmacy_id,
            COALESCE(v_parent_id, v_effective_pharmacy_id)
          )
      AND p.status = 'active'
    ON CONFLICT (service_request_id, processor_id) DO NOTHING;

    GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

    BEGIN
        INSERT INTO processor_notifications (
            processor_id, type, title, message,
            entity_type, entity_id, metadata
        )
        SELECT
            sra.processor_id,
            'service_request_new',
            'New on-site service request',
            COALESCE(ph.pharmacy_name, ph.name, 'A pharmacy')
                || ' requested an on-site visit for '
                || to_char(p_requested_date, 'Mon DD, YYYY')
                || CASE
                    WHEN p_purpose IS NOT NULL THEN ' (' || INITCAP(REPLACE(p_purpose, '_', ' ')) || ')'
                    ELSE ''
                END,
            'service_request',
            v_request_id,
            jsonb_build_object(
                'pharmacy_id',    p_pharmacy_id,
                'branch_id',      p_branch_id,
                'purpose',        p_purpose,
                'requested_date', p_requested_date,
                'pharmacy_name',  COALESCE(ph.pharmacy_name, ph.name)
            )
        FROM service_request_assignments sra
        LEFT JOIN pharmacy ph ON ph.id = v_effective_pharmacy_id
        WHERE sra.service_request_id = v_request_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    SELECT
        to_jsonb(sr.*) || jsonb_build_object(
            'pharmacy_name',     ph.pharmacy_name,
            'pharmacy_business_name', ph.name,
            'pharmacy_email',    ph.email,
            'pharmacy_phone',    ph.phone,
            'pharmacy_address',  ph.physical_address
        ) INTO v_request_row
    FROM service_requests sr
    LEFT JOIN pharmacy ph ON ph.id = sr.pharmacy_id
    WHERE sr.id = v_request_id;

    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'processor_id', p.id,
            'name',         p.name,
            'email',        p.email,
            'phone',        p.phone
        )),
        '[]'::jsonb
    )
    INTO v_assigned_processors
    FROM service_request_assignments sra
    JOIN processors p ON p.id = sra.processor_id
    WHERE sra.service_request_id = v_request_id;

    RETURN v_request_row
        || jsonb_build_object(
            'assigned_processors', v_assigned_processors,
            'assigned_count',      v_assigned_count
        );
END;
$$;

GRANT EXECUTE ON FUNCTION create_service_request TO service_role, authenticated;

COMMENT ON FUNCTION create_service_request IS 'Creates on-site service request; single overload — pharmacy, requested_date, branch, …';
