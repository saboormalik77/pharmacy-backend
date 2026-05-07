-- ============================================================================
-- Simple create_service_request Function - Focus on purpose optional
-- ============================================================================
-- This creates a simplified version that works with current schema
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS create_service_request;

-- Create simplified function
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
    v_request_id UUID;
    v_request_row JSONB;
BEGIN
    -- Basic validation
    IF p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id is required';
    END IF;
    
    IF p_requested_date IS NULL THEN
        RAISE EXCEPTION 'requested_date is required';
    END IF;
    
    IF p_requested_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'requested_date cannot be in the past';
    END IF;

    -- Insert the service request (purpose is optional now)
    INSERT INTO service_requests (
        pharmacy_id,
        branch_id,
        requested_by_user_id,
        requested_date,
        purpose,
        special_instructions,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_pharmacy_id,
        p_branch_id,
        p_requested_by_user_id,
        p_requested_date,
        p_purpose,  -- Can be NULL
        p_special_instructions,
        'pending',
        NOW(),
        NOW()
    ) RETURNING id INTO v_request_id;

    -- Return basic request info
    SELECT jsonb_build_object(
        'id', sr.id,
        'pharmacy_id', sr.pharmacy_id,
        'branch_id', sr.branch_id,
        'requested_by_user_id', sr.requested_by_user_id,
        'requested_date', sr.requested_date,
        'purpose', sr.purpose,
        'special_instructions', sr.special_instructions,
        'status', sr.status,
        'created_at', sr.created_at,
        'pharmacy_business_name', ph.name,
        'pharmacy_email', ph.email,
        'pharmacy_phone', ph.phone,
        'pharmacy_address', ph.physical_address
    )
    INTO v_request_row
    FROM service_requests sr
    LEFT JOIN pharmacy ph ON ph.id = sr.pharmacy_id
    WHERE sr.id = v_request_id;

    RETURN v_request_row;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_service_request TO service_role, authenticated;