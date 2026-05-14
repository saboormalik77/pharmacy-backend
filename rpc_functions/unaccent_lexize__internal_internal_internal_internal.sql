-- Function : unaccent_lexize
-- Arguments: internal, internal, internal, internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.unaccent_lexize(internal, internal, internal, internal) CASCADE;

CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$;
