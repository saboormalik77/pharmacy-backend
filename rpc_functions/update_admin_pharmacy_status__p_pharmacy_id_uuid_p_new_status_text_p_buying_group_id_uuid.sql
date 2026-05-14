-- Function : update_admin_pharmacy_status
-- Arguments: p_pharmacy_id uuid, p_new_status text, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_admin_pharmacy_status(p_pharmacy_id uuid, p_new_status text, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.update_admin_pharmacy_status(p_pharmacy_id uuid, p_new_status text, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_exists BOOLEAN;
    v_old_status TEXT;
BEGIN
    -- Validate status value
    IF p_new_status NOT IN ('pending', 'active', 'suspended', 'blacklisted') THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Invalid status. Must be one of: pending, active, suspended, blacklisted',
            'code', 400
        );
    END IF;
    
    -- Check if pharmacy exists AND belongs to the caller's buying group.
    SELECT EXISTS(
        SELECT 1 FROM pharmacy
        WHERE id = p_pharmacy_id
          AND (p_buying_group_id IS NULL OR created_by = p_buying_group_id)
    )
    INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Pharmacy not found',
            'code', 404
        );
    END IF;
    
    -- Get old status for logging
    SELECT status INTO v_old_status FROM pharmacy WHERE id = p_pharmacy_id;
    
    -- Update status
    UPDATE pharmacy
    SET
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_pharmacy_id;
    
    -- Return success with updated pharmacy (scoped to the same buying group).
    v_result := get_admin_pharmacy_by_id(p_pharmacy_id, p_buying_group_id);
    v_result := v_result || jsonb_build_object(
        'statusChange', jsonb_build_object(
            'from', v_old_status,
            'to', p_new_status
        )
    );
    
    RETURN v_result;
END;
$function$;
