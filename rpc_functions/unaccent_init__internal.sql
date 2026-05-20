-- Function : unaccent_init
-- Arguments: internal
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.unaccent_init(internal) CASCADE;

CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$;
