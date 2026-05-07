-- ============================================================================
-- Fix create_service_request Function - Drop all versions and recreate
-- ============================================================================
-- This migration drops all existing versions of create_service_request function
-- and creates a new version with optional purpose parameter
-- ============================================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS create_service_request(uuid, date, uuid, text, text);
DROP FUNCTION IF EXISTS create_service_request(uuid, date, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS create_service_request(uuid, uuid, date, text, text);
DROP FUNCTION IF EXISTS create_service_request(uuid, uuid, date, text, text, uuid);

-- Create the new function with proper parameter order (required params first, defaults last)
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
    -- ---- Validation -----------------------------------------------------
    
    -- Determine effective pharmacy (branch → parent lookup)
    IF p_branch_id IS NOT NULL THEN
        SELECT parent_id INTO v_parent_id 
        FROM pharmacy 
        WHERE id = p_branch_id AND parent_id IS NOT NULL;
        
        IF v_parent_id IS NOT NULL THEN
            v_effective_pharmacy_id := v_parent_id;
        ELSE
            -- Branch doesn't exist or is not a branch
            RAISE EXCEPTION 'Invalid branch_id: %', p_branch_id;
        END IF;
    ELSE
        v_effective_pharmacy_id := p_pharmacy_id;
    END IF;

    -- Get buying_group_id
    SELECT buying_group_id INTO v_buying_group_id 
    FROM pharmacy 
    WHERE id = v_effective_pharmacy_id;
    
    IF v_buying_group_id IS NULL THEN
        RAISE EXCEPTION 'Pharmacy % not found or missing buying_group_id', v_effective_pharmacy_id;
    END IF;

    -- ---- Create the service request ------------------------------------
    
    INSERT INTO service_requests (
        pharmacy_id,
        branch_id,
        requested_by_user_id,
        buying_group_id,
        requested_date,
        purpose,
        special_instructions,
        status
    ) VALUES (
        p_pharmacy_id,
        p_branch_id,
        p_requested_by_user_id,
        v_buying_group_id,
        p_requested_date,
        p_purpose,  -- Can be NULL now
        p_special_instructions,
        'pending'
    ) RETURNING id INTO v_request_id;

    -- ---- Auto-assign to processors ------------------------------------
    
    -- Find all active processors in the same buying group
    INSERT INTO service_request_assignments (service_request_id, processor_id)
    SELECT v_request_id, p.id
    FROM processors p
    WHERE p.buying_group_id = v_buying_group_id
      AND p.status = 'active';
    
    GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

    -- ---- Build return object ------------------------------------------
    
    -- Get the full request row with joined data
    SELECT 
        jsonb_build_object(
            'id', sr.id,
            'pharmacy_id', sr.pharmacy_id,
            'branch_id', sr.branch_id,
            'requested_by_user_id', sr.requested_by_user_id,
            'buying_group_id', sr.buying_group_id,
            'requested_date', sr.requested_date,
            'purpose', sr.purpose,
            'special_instructions', sr.special_instructions,
            'status', sr.status,
            'created_at', sr.created_at,
            'pharmacy_business_name', ph.business_name,
            'pharmacy_email', ph.email,
            'pharmacy_phone', ph.phone,
            'pharmacy_address', ph.physical_address,
            'branch_name', CASE 
                WHEN sr.branch_id IS NOT NULL THEN br.business_name 
                ELSE NULL 
            END,
            'assigned_processor_count', v_assigned_count
        )
    INTO v_request_row
    FROM service_requests sr
    LEFT JOIN pharmacy ph ON ph.id = sr.pharmacy_id
    LEFT JOIN pharmacy br ON br.id = sr.branch_id
    WHERE sr.id = v_request_id;

    RETURN v_request_row;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_service_request TO service_role, authenticated;

-- Add comment
COMMENT ON FUNCTION create_service_request IS 'Creates a new service request with optional purpose field and auto-assigns to eligible processors';