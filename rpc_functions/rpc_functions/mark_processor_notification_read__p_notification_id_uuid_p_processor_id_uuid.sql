-- Function : mark_processor_notification_read
-- Arguments: p_notification_id uuid, p_processor_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.mark_processor_notification_read(p_notification_id uuid, p_processor_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.mark_processor_notification_read(p_notification_id uuid, p_processor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_notification_id IS NULL OR p_processor_id IS NULL THEN
        RAISE EXCEPTION 'notification_id and processor_id are required'
            USING ERRCODE = '22023';
    END IF;

    UPDATE processor_notifications
       SET is_read = TRUE,
           read_at = NOW()
     WHERE id = p_notification_id
       AND processor_id = p_processor_id
       AND is_read = FALSE;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', v_updated > 0, 'updated_count', v_updated);
END;
$function$;
