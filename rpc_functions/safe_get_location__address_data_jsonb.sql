-- Function : safe_get_location
-- Arguments: address_data jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.safe_get_location(address_data jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.safe_get_location(address_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_city TEXT;
  v_state TEXT;
BEGIN
  IF address_data IS NULL THEN
    RETURN '';
  END IF;
  
  v_city := COALESCE(address_data->>'city', '');
  v_state := COALESCE(address_data->>'state', '');
  
  IF v_city = '' AND v_state = '' THEN
    RETURN '';
  ELSIF v_state = '' THEN
    RETURN v_city;
  ELSIF v_city = '' THEN
    RETURN v_state;
  ELSE
    RETURN v_city || ', ' || v_state;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN '';
END;
$function$;
