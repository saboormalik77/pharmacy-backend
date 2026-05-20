-- Function : gtrgm_same
-- Arguments: gtrgm, gtrgm, internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gtrgm_same(gtrgm, gtrgm, internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$;
