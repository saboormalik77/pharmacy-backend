-- Function : gin_extract_value_trgm
-- Arguments: text, internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gin_extract_value_trgm(text, internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$;
