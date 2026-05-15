-- Function : pharmacy_payment_generate_check_number
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_generate_check_number() CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_generate_check_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_check_number TEXT;
  v_base_number INTEGER;
  v_attempts INTEGER := 0;
BEGIN
  LOOP
    v_base_number := 200000 + floor(random() * 800000)::integer;
    v_check_number := v_base_number::text;
    
    IF NOT EXISTS (SELECT 1 FROM pharmacy_payments WHERE check_number = v_check_number) THEN
      RETURN v_check_number;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique check number after 100 attempts';
    END IF;
  END LOOP;
END;
$function$;
