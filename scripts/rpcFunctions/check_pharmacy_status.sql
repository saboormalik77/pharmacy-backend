-- ============================================================
-- Helper Function: check_pharmacy_status
-- Used by: All pharmacy-facing RPC functions
-- ============================================================
-- Verifies pharmacy is not suspended/blacklisted before proceeding
-- Raises exception if pharmacy is blocked, returns nothing if OK
-- ============================================================

DROP FUNCTION IF EXISTS check_pharmacy_status(UUID);

CREATE OR REPLACE FUNCTION check_pharmacy_status(
    p_pharmacy_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Check if pharmacy exists
    SELECT EXISTS(SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id)
    INTO v_exists;
    
    IF NOT v_exists THEN
        RAISE EXCEPTION 'Pharmacy not found'
            USING ERRCODE = 'P0404';  -- Custom error code
    END IF;
    
    -- Get pharmacy status
    SELECT COALESCE(status, 'pending')
    INTO v_status
    FROM pharmacy
    WHERE id = p_pharmacy_id;
    
    -- Check status and raise appropriate exceptions
    IF v_status = 'blacklisted' THEN
        RAISE EXCEPTION 'Your pharmacy account has been permanently blocked. Access to the platform is denied.'
            USING ERRCODE = 'P0403';  -- Forbidden
    ELSIF v_status = 'suspended' THEN
        RAISE EXCEPTION 'Your pharmacy account has been suspended. Please contact support for more information.'
            USING ERRCODE = 'P0403';  -- Forbidden
    ELSIF v_status = 'pending' THEN
        RAISE EXCEPTION 'Your pharmacy account is pending approval. Please wait for account activation.'
            USING ERRCODE = 'P0403';  -- Forbidden
    ELSIF v_status != 'active' THEN
        RAISE EXCEPTION 'Your pharmacy account status is invalid. Please contact support.'
            USING ERRCODE = 'P0403';  -- Forbidden
    END IF;
    
    -- If we reach here, pharmacy is active - return nothing
    RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_pharmacy_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_pharmacy_status(UUID) TO service_role;

-- ============================================================
-- Test the function:
-- ============================================================
-- SELECT check_pharmacy_status('active-pharmacy-uuid');  -- Should return nothing
-- SELECT check_pharmacy_status('suspended-pharmacy-uuid');  -- Should raise exception

