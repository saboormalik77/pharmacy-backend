-- Function : word_similarity
-- Arguments: text, text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.word_similarity(text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$;
