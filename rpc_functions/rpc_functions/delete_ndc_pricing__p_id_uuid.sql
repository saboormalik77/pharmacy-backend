-- Function : delete_ndc_pricing
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_ndc_pricing(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_ndc_pricing(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM ndc_pricing WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'NDC pricing not found');
  END IF;
  RETURN jsonb_build_object('error', false, 'message', 'Deleted successfully');
END;
$function$;
