-- Function : strict_word_similarity
-- Arguments: text, text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.strict_word_similarity(text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$;
