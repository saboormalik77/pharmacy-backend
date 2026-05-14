-- Function : update_admin_distributor_status
-- Arguments: p_distributor_id uuid, p_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_admin_distributor_status(p_distributor_id uuid, p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_admin_distributor_status(p_distributor_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_is_active BOOLEAN;
BEGIN
    -- Check if distributor exists
    IF NOT EXISTS (SELECT 1 FROM reverse_distributors WHERE id = p_distributor_id) THEN
        RAISE EXCEPTION 'Distributor not found';
    END IF;
    
    -- Validate status
    IF p_status NOT IN ('active', 'inactive') THEN
        RAISE EXCEPTION 'Invalid status. Must be "active" or "inactive"';
    END IF;
    
    -- Convert status to boolean
    v_is_active := (p_status = 'active');
    
    -- Update distributor status
    UPDATE reverse_distributors
    SET is_active = v_is_active
    WHERE id = p_distributor_id;
    
    -- Get the updated distributor
    v_result := get_admin_distributor_by_id(p_distributor_id);
    
    RETURN v_result;
END;
$function$;
