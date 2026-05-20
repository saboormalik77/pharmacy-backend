-- Function : clean_hostname
-- Arguments: p_input text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.clean_hostname(p_input text) CASCADE;

CREATE OR REPLACE FUNCTION public.clean_hostname(p_input text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_result TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_result := LOWER(TRIM(p_input));
  
  -- Remove protocol prefix
  v_result := REGEXP_REPLACE(v_result, '^https?://', '');
  
  -- Remove trailing slashes
  v_result := REGEXP_REPLACE(v_result, '/+$', '');
  
  -- Remove any path after the hostname
  v_result := SPLIT_PART(v_result, '/', 1);
  
  -- Remove port if present
  v_result := SPLIT_PART(v_result, ':', 1);
  
  -- Return NULL if empty
  IF v_result = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN v_result;
END;
$function$;
