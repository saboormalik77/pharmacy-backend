-- Function : gin_trgm_triconsistent
-- Arguments: internal, smallint, text, integer, internal, internal, internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$;
