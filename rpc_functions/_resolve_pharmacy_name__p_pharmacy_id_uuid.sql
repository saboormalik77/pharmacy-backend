-- Function : _resolve_pharmacy_name
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._resolve_pharmacy_name(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public._resolve_pharmacy_name(p_pharmacy_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(
    NULLIF(TRIM(p.pharmacy_name), ''),
    NULLIF(TRIM(p.name), ''),
    NULLIF(TRIM(SPLIT_PART(p.email, '@', 1)), ''),
    'Unknown Pharmacy'
  )
  FROM public.pharmacy p
  WHERE p.id = p_pharmacy_id;
$function$;
