-- Function : similarity_op
-- Arguments: text, text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.similarity_op(text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$;
