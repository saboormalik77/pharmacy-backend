-- Function : trigger_record_product_add_activity
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.trigger_record_product_add_activity() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_record_product_add_activity()
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
        NEW.added_by,
        'product_added',
        NEW.id,
        COALESCE(NEW.product_name, 'NDC: ' || NEW.ndc),
        jsonb_build_object(
            'ndc', NEW.ndc,
            'product_name', NEW.product_name,
            'full_units', NEW.full_units,
            'partial_units', NEW.partial_units,
            'lot_number', NEW.lot_number,
            'expiration_date', NEW.expiration_date
        )
    );
    
    RETURN NEW;
END;
$function$;
