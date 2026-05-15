-- Function : set_limit
-- Arguments: real
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.set_limit(real) CASCADE;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$;
