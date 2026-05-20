-- Function : mark_all_processor_notifications_read
-- Arguments: p_processor_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.mark_all_processor_notifications_read(p_processor_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.mark_all_processor_notifications_read(p_processor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_processor_id IS NULL THEN
        RAISE EXCEPTION 'processor_id is required' USING ERRCODE = '22023';
    END IF;

    UPDATE processor_notifications
       SET is_read = TRUE,
           read_at = NOW()
     WHERE processor_id = p_processor_id
       AND is_read = FALSE;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated);
END;
$function$;
