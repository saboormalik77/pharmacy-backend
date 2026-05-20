-- Function : gtrgm_in
-- Arguments: cstring
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gtrgm_in(cstring) CASCADE;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$;
