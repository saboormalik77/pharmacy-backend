-- Function : generate_order_number
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || LPAD(nextval('marketplace_order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;
