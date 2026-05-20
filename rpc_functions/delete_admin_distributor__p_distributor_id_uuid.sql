-- Function : delete_admin_distributor
-- Arguments: p_distributor_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_admin_distributor(p_distributor_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_admin_distributor(p_distributor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_distributor_name TEXT;
    v_deals_count INTEGER;
BEGIN
    -- Check if distributor exists
    IF NOT EXISTS (SELECT 1 FROM reverse_distributors WHERE id = p_distributor_id) THEN
        RAISE EXCEPTION 'Distributor not found';
    END IF;
    
    -- Get distributor name for response
    SELECT name INTO v_distributor_name
    FROM reverse_distributors
    WHERE id = p_distributor_id;
    
    -- Check for existing deals (packages)
    SELECT COUNT(*)::INTEGER INTO v_deals_count
    FROM custom_packages
    WHERE distributor_id = p_distributor_id;
    
    -- Prevent deletion if there are existing deals
    IF v_deals_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete distributor with % existing deal(s). Deactivate instead.', v_deals_count;
    END IF;
    
    -- Delete the distributor
    DELETE FROM reverse_distributors
    WHERE id = p_distributor_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'Distributor "' || v_distributor_name || '" deleted successfully',
        'deletedId', p_distributor_id,
        'deletedAt', NOW()
    );
    
    RETURN v_result;
END;
$function$;
