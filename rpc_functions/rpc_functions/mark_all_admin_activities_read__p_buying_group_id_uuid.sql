-- Function : mark_all_admin_activities_read
-- Arguments: p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.mark_all_admin_activities_read(p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.mark_all_admin_activities_read(p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update all unread activities to read (scoped to buying group)
    UPDATE admin_recent_activity
    SET is_read = TRUE,
        read_at = NOW()
    WHERE (is_read = FALSE OR is_read IS NULL)
    AND (
        p_buying_group_id IS NULL OR 
        pharmacy_id IN (
            SELECT id FROM pharmacy WHERE created_by = p_buying_group_id
        )
    );
    
    -- Get the number of rows updated
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'All activities marked as read',
        'updatedCount', v_updated_count,
        'markedAt', NOW()
    );
END;
$function$;
