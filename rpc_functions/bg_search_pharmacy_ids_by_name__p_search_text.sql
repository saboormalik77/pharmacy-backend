-- Function : bg_search_pharmacy_ids_by_name
-- Arguments: p_search text
-- Type     : FUNCTION
-- Database : BG ADMIN DB (kxmdzduhjmgvdikaewfo.supabase.co)
-- NOTE     : Returns array of pharmacy UUIDs whose name matches search term
-- =============================================================

DROP FUNCTION IF EXISTS public.bg_search_pharmacy_ids_by_name(text) CASCADE;

CREATE OR REPLACE FUNCTION public.bg_search_pharmacy_ids_by_name(p_search text DEFAULT NULL::text)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_ids uuid[];
BEGIN
  IF p_search IS NULL OR trim(p_search) = '' THEN
    RETURN NULL;
  END IF;

  SELECT ARRAY_AGG(p.id) INTO v_ids
  FROM pharmacy p
  WHERE p.pharmacy_name ILIKE '%' || p_search || '%';

  RETURN v_ids;
END;
$function$;
