-- Function : show_trgm
-- Arguments: text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.show_trgm(text) CASCADE;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$;
