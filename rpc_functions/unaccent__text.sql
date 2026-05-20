-- Function : unaccent
-- Arguments: text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.unaccent(text) CASCADE;

CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$;
