-- Function : get_ndc_pricing_intelligence
-- Arguments: p_ndc text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_ndc_pricing_intelligence(p_ndc text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_ndc_pricing_intelligence(p_ndc text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_norm  TEXT;
  v_row   public.ndc_pricing;
BEGIN
  IF p_ndc IS NULL OR TRIM(p_ndc) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'NDC is required');
  END IF;

  v_norm := LOWER(REPLACE(TRIM(p_ndc), '-', ''));
  IF LENGTH(v_norm) < 10 THEN
    v_norm := LPAD(v_norm, 11, '0');
  END IF;

  SELECT * INTO v_row FROM public.ndc_pricing WHERE ndc_normalized = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', false,
      'data', jsonb_build_object(
        'found', false,
        'ndc', p_ndc,
        'ndcNormalized', v_norm,
        'currentPrice', NULL,
        'avgAskPrice', NULL,
        'avgReceivedPrice', NULL,
        'askReceivedRatio', NULL,
        'paymentSampleCount', 0,
        'aiConfidence', NULL,
        'manufacturerReliability', 'unknown',
        'last5Payments', '[]'::jsonb
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', public._ndc_pricing_to_json(v_row) || jsonb_build_object('found', true)
  );
END;
$function$;
