-- Function : update_processed_inbox_timestamp
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_processed_inbox_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION public.update_processed_inbox_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.processed_at = NOW();
  RETURN NEW;
END;
$function$;
