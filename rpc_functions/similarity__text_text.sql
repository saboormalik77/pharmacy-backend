-- Function : similarity
-- Arguments: text, text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.similarity(text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$;
