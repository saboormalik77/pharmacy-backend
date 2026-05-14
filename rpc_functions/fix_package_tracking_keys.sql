-- Function : fix_package_tracking_keys
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.fix_package_tracking_keys() CASCADE;

CREATE OR REPLACE FUNCTION public.fix_package_tracking_keys()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If package_tracking has numeric keys, convert them to "packageN" format
    IF NEW.package_tracking IS NOT NULL 
       AND jsonb_typeof(NEW.package_tracking) = 'object'
       AND EXISTS (
           SELECT 1 FROM jsonb_object_keys(NEW.package_tracking) k 
           WHERE k ~ '^[0-9]+$'
       ) THEN
        
        NEW.package_tracking := (
            SELECT jsonb_object_agg(
                CASE 
                    WHEN key ~ '^[0-9]+$' THEN 'package' || key
                    ELSE key
                END, 
                value
            )
            FROM jsonb_each_text(NEW.package_tracking)
        );
    END IF;
    
    RETURN NEW;
END;
$function$;
