-- Function : gin_extract_query_trgm
-- Arguments: text, internal, smallint, internal, internal, internal, internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) CASCADE;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$;
