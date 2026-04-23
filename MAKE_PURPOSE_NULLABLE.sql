-- ============================================================================
-- SERVICE REQUESTS: Make Purpose Field Optional (Nullable)
-- ============================================================================
-- This migration makes the 'purpose' field in service_requests table nullable
-- and removes the NOT NULL constraint to allow service requests without
-- specifying a purpose.
--
-- Execute with: npx supabase db query --linked < MAKE_PURPOSE_NULLABLE.sql
-- ============================================================================

-- Make purpose field nullable by removing NOT NULL constraint
ALTER TABLE service_requests 
ALTER COLUMN purpose DROP NOT NULL;

-- Update the check constraint to allow null values
-- First drop the existing constraint
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_purpose_check;

-- Add new constraint that allows null or the valid enum values
ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_purpose_check 
CHECK (purpose IS NULL OR purpose IN ('return_pickup','training','inventory_review','destruction_pickup','other'));

-- Update the RPC function to handle null purpose values
-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS create_service_request(uuid, uuid, date, text, text);
DROP FUNCTION IF EXISTS create_service_request(uuid, uuid, date, text, text, uuid);

-- Recreate the function with updated parameter order
CREATE OR REPLACE FUNCTION create_service_request(
    p_pharmacy_id UUID,
    p_requested_date DATE,
    p_branch_id UUID DEFAULT NULL,
    p_purpose TEXT DEFAULT NULL,
    p_special_instructions TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_request_row JSON;
    v_processors processors[];
    v_processor processors;
    v_buying_group_id UUID;
    v_business_name TEXT;
    v_email TEXT;
    v_phone TEXT;
    v_address TEXT;
BEGIN
    -- Get pharmacy details and buying_group_id
    SELECT 
        ph.buying_group_id,
        ph.business_name,
        ph.email,
        ph.phone,
        ph.physical_address
    INTO 
        v_buying_group_id,
        v_business_name,
        v_email,
        v_phone,
        v_address
    FROM pharmacy ph 
    WHERE ph.id = p_pharmacy_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pharmacy not found';
    END IF;

    -- Insert the service request (purpose can be null now)
    INSERT INTO service_requests (
        pharmacy_id,
        branch_id,
        requested_date,
        purpose,
        special_instructions,
        buying_group_id
    ) VALUES (
        p_pharmacy_id,
        p_branch_id,
        p_requested_date,
        p_purpose,
        p_special_instructions,
        v_buying_group_id
    ) RETURNING 
        json_build_object(
            'id', id,
            'pharmacy_id', pharmacy_id,
            'branch_id', branch_id,
            'requested_date', requested_date,
            'purpose', purpose,
            'special_instructions', special_instructions,
            'status', status,
            'created_at', created_at,
            'pharmacy_business_name', v_business_name,
            'pharmacy_email', v_email,
            'pharmacy_phone', v_phone,
            'pharmacy_address', v_address
        ) INTO v_request_row;

    -- Get eligible processors for this buying group and geographic area
    SELECT array_agg(p.*)
    INTO v_processors
    FROM processors p
    WHERE p.buying_group_id = v_buying_group_id
      AND p.status = 'active';

    -- Create assignments for each eligible processor
    FOR v_processor IN SELECT unnest(v_processors) LOOP
        INSERT INTO service_request_assignments (
            service_request_id,
            processor_id
        ) VALUES (
            (v_request_row->>'id')::UUID,
            v_processor.id
        );
    END LOOP;

    RETURN v_request_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_service_request TO authenticated;

-- Comment indicating the change
COMMENT ON COLUMN service_requests.purpose IS 'Purpose of the service request - now optional/nullable';