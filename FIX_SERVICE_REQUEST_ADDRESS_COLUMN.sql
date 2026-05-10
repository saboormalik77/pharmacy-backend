-- ============================================================================
-- FIX: Update create_service_request RPC to use correct pharmacy address column
-- ============================================================================
-- The RPC was trying to select 'ph.address' but the pharmacy table uses
-- 'physical_address' column instead.

-- First check what column actually exists in the pharmacy table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pharmacy' 
  AND column_name IN ('address', 'physical_address');

-- Update the create_service_request function to use the correct column
CREATE OR REPLACE FUNCTION create_service_request(
    p_pharmacy_id          UUID,
    p_branch_id            UUID,
    p_requested_date       DATE,
    p_purpose              TEXT,
    p_special_instructions TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_request_id UUID;
    v_request_row JSONB;
    v_assigned_processors JSONB;
BEGIN
    -- Input validation
    IF p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id is required' USING ERRCODE = '22023';
    END IF;
    IF p_requested_date IS NULL THEN
        RAISE EXCEPTION 'requested_date is required' USING ERRCODE = '22023';
    END IF;
    IF p_purpose IS NULL OR p_purpose = '' THEN
        RAISE EXCEPTION 'purpose is required' USING ERRCODE = '22023';
    END IF;

    -- Insert service request
    INSERT INTO service_requests (
        pharmacy_id,
        branch_id,
        requested_date,
        purpose,
        special_instructions,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_pharmacy_id,
        p_branch_id,
        p_requested_date,
        p_purpose,
        p_special_instructions,
        'pending',
        NOW(),
        NOW()
    ) RETURNING id INTO v_request_id;

    -- Auto-assign processors based on pharmacy's buying group
    INSERT INTO service_request_assignments (service_request_id, processor_id)
    SELECT v_request_id, pr.id
    FROM processors pr
    WHERE pr.buying_group_id = (
        SELECT created_by FROM pharmacy WHERE id = p_pharmacy_id
    );

    -- Include pharmacy details in the response for email notifications
    SELECT 
        to_jsonb(sr.*) || jsonb_build_object(
            'pharmacy_name',     ph.pharmacy_name,
            'pharmacy_business_name', ph.name,
            'pharmacy_email',    ph.email,
            'pharmacy_phone',    ph.phone,
            'pharmacy_address',  ph.physical_address  -- FIXED: use physical_address
        ) INTO v_request_row
    FROM service_requests sr
    LEFT JOIN pharmacy ph ON ph.id = sr.pharmacy_id
    WHERE sr.id = v_request_id;

    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'processor_id', pr.id,
            'name',         pr.name,
            'email',        pr.email,
            'phone',        pr.phone
        )),
        '[]'::jsonb
    ) INTO v_assigned_processors
    FROM service_request_assignments sra
    JOIN processors pr ON pr.id = sra.processor_id
    WHERE sra.service_request_id = v_request_id;

    RETURN v_request_row || jsonb_build_object(
        'assigned_processors', v_assigned_processors
    );
END;
$$;