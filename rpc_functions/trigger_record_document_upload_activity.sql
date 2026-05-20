-- Function : trigger_record_document_upload_activity
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.trigger_record_document_upload_activity() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_record_document_upload_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.admin_recent_activity (
        pharmacy_id,
        activity_type,
        entity_id,
        entity_name,
        metadata
    )
    VALUES (
        NEW.pharmacy_id,
        'document_uploaded',
        NEW.id,
        NEW.file_name,
        jsonb_build_object(
            'file_size', NEW.file_size,
            'file_type', NEW.file_type,
            'source', NEW.source,
            'status', NEW.status,
            'reverse_distributor_id', NEW.reverse_distributor_id
        )
    );
    
    RETURN NEW;
END;
$function$;
