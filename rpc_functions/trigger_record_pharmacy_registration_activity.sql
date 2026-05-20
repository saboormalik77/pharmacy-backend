-- Function : trigger_record_pharmacy_registration_activity
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.trigger_record_pharmacy_registration_activity() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_record_pharmacy_registration_activity()
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
        NEW.id,
        'pharmacy_registered',
        NEW.id,
        NEW.pharmacy_name,
        jsonb_build_object(
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'npi_number', NEW.npi_number,
            'dea_number', NEW.dea_number
        )
    );
    
    RETURN NEW;
END;
$function$;
