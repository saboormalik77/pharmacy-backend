-- Function : gtrgm_options
-- Arguments: internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gtrgm_options(internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$;
