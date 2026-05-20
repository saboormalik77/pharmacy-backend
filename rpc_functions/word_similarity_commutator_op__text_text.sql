-- Function : word_similarity_commutator_op
-- Arguments: text, text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.word_similarity_commutator_op(text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$;
