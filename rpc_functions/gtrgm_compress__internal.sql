-- Function : gtrgm_compress
-- Arguments: internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gtrgm_compress(internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$;
