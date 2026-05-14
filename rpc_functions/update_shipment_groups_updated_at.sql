-- Function : update_shipment_groups_updated_at
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_shipment_groups_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_shipment_groups_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
