-- Function : gtrgm_penalty
-- Arguments: internal, internal, internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gtrgm_penalty(internal, internal, internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$;
