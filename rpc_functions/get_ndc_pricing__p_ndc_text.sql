-- Function : get_ndc_pricing
-- Arguments: p_ndc text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_ndc_pricing(p_ndc text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_ndc_pricing(p_ndc text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_norm TEXT;
  v_row  ndc_pricing;
BEGIN
  v_norm := LOWER(REPLACE(TRIM(p_ndc), '-', ''));
  IF LENGTH(v_norm) < 10 THEN
    v_norm := LPAD(v_norm, 11, '0');
  END IF;

  SELECT * INTO v_row FROM ndc_pricing WHERE ndc_normalized = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'NDC pricing not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'data', _ndc_pricing_to_json(v_row));
END;
$function$;
