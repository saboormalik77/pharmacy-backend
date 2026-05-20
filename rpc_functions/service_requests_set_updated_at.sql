-- Function : service_requests_set_updated_at
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.service_requests_set_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.service_requests_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;
