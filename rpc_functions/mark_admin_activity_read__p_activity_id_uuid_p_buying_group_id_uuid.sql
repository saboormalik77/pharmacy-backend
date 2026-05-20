-- Function : mark_admin_activity_read
-- Arguments: p_activity_id uuid, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.mark_admin_activity_read(p_activity_id uuid, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.mark_admin_activity_read(p_activity_id uuid, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_pharmacy_created_by UUID;
    v_activity_exists BOOLEAN;
BEGIN
    -- Find the activity and verify buying group access
    SELECT p.created_by, TRUE
    INTO v_pharmacy_created_by, v_activity_exists
    FROM admin_recent_activity a
    INNER JOIN pharmacy p ON a.pharmacy_id = p.id
    WHERE a.id = p_activity_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Activity not found'
        );
    END IF;

    -- Check buying group access (MainAdmin with p_buying_group_id=NULL can access all)
    IF p_buying_group_id IS NOT NULL AND v_pharmacy_created_by <> p_buying_group_id THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Access denied'
        );
    END IF;
    
    -- Update activity to read
    UPDATE admin_recent_activity
    SET is_read = TRUE,
        read_at = NOW()
    WHERE id = p_activity_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Activity marked as read',
        'activityId', p_activity_id,
        'markedAt', NOW()
    );
END;
$function$;
