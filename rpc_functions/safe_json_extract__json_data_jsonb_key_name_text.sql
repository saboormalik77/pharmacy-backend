-- Function : safe_json_extract
-- Arguments: json_data jsonb, key_name text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.safe_json_extract(json_data jsonb, key_name text) CASCADE;

CREATE OR REPLACE FUNCTION public.safe_json_extract(json_data jsonb, key_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF json_data IS NULL THEN
    RETURN '';
  END IF;
  RETURN COALESCE(json_data->>key_name, '');
EXCEPTION WHEN OTHERS THEN
  RETURN '';
END;
$function$;
