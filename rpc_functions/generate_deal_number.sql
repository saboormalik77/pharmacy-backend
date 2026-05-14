-- Function : generate_deal_number
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.generate_deal_number() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_deal_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.deal_number IS NULL THEN
    NEW.deal_number := 'DEAL-' || LPAD(nextval('marketplace_deal_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$function$;
