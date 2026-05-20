-- Function : get_destination_for_ndc
-- Arguments: p_ndc text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_destination_for_ndc(p_ndc text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_destination_for_ndc(p_ndc text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_labeler_id TEXT;
  v_destination TEXT;
BEGIN
  v_labeler_id := SUBSTRING(REGEXP_REPLACE(COALESCE(p_ndc, ''), '[^0-9]', '', 'g') FROM 1 FOR 5);
  IF v_labeler_id IS NULL OR LENGTH(TRIM(v_labeler_id)) < 5 THEN
    RETURN NULL;
  END IF;

  SELECT mrp.destination INTO v_destination
  FROM manufacturer_policies mp
  JOIN manufacturer_return_policies mrp ON mp.id = mrp.manufacturer_policy_id
  WHERE mp.labeler_id = v_labeler_id
  ORDER BY mrp.created_at ASC
  LIMIT 1;

  RETURN v_destination;
END;
$function$;
