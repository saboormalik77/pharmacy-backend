-- Function : gin_trgm_consistent
-- Arguments: internal, smallint, text, integer, internal, internal, internal, internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$;
