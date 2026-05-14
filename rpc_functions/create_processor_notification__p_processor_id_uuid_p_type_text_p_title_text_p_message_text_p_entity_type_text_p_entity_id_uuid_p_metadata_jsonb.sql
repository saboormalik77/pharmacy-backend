-- Function : create_processor_notification
-- Arguments: p_processor_id uuid, p_type text, p_title text, p_message text, p_entity_type text, p_entity_id uuid, p_metadata jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_processor_notification(p_processor_id uuid, p_type text, p_title text, p_message text, p_entity_type text, p_entity_id uuid, p_metadata jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.create_processor_notification(p_processor_id uuid, p_type text, p_title text, p_message text, p_entity_type text, p_entity_id uuid, p_metadata jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_id UUID;
BEGIN
    IF p_processor_id IS NULL OR p_type IS NULL
       OR p_title IS NULL OR p_message IS NULL THEN
        RAISE EXCEPTION 'processor_id, type, title and message are required'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO processor_notifications (
        processor_id, type, title, message,
        entity_type, entity_id, metadata
    ) VALUES (
        p_processor_id, p_type, p_title, p_message,
        p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$function$;
