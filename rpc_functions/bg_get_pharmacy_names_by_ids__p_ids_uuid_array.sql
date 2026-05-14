-- Function : bg_get_pharmacy_names_by_ids
-- Arguments: p_ids uuid[]
-- Type     : FUNCTION
-- Database : BG ADMIN DB (kxmdzduhjmgvdikaewfo.supabase.co)
-- NOTE     : Returns id→name map for a list of pharmacy IDs
-- =============================================================

DROP FUNCTION IF EXISTS public.bg_get_pharmacy_names_by_ids(uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.bg_get_pharmacy_names_by_ids(p_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_ids IS NULL OR array_length(p_ids, 1) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(p.id::text, COALESCE(p.pharmacy_name, '')),
    '{}'::jsonb
  ) INTO v_result
  FROM pharmacy p
  WHERE p.id = ANY(p_ids);

  RETURN v_result;
END;
$function$;
