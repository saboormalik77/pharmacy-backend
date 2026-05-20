-- Function : resolve_ndc_price_with_intelligence
-- Arguments: p_ndc text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.resolve_ndc_price_with_intelligence(p_ndc text) CASCADE;

CREATE OR REPLACE FUNCTION public.resolve_ndc_price_with_intelligence(p_ndc text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_norm TEXT;
  v_row  public.ndc_pricing;
BEGIN
  v_norm := LOWER(REPLACE(TRIM(COALESCE(p_ndc, '')), '-', ''));
  IF v_norm = '' THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  IF LENGTH(v_norm) < 10 THEN
    v_norm := LPAD(v_norm, 11, '0');
  END IF;

  SELECT * INTO v_row FROM public.ndc_pricing WHERE ndc_normalized = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'currentPrice', NULL,
      'estimatedStorePrice', NULL,
      'priceSource', NULL,
      'closeOutDestination', NULL,
      'productName', NULL,
      'avgAskPrice', NULL,
      'avgReceivedPrice', NULL,
      'askReceivedRatio', NULL,
      'paymentSampleCount', 0,
      'manufacturerReliability', 'unknown',
      'last5Payments', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'found',                   true,
    'currentPrice',            v_row.current_price,
    'estimatedStorePrice',     v_row.estimated_store_price,
    'priceSource',             v_row.price_source,
    'closeOutDestination',     v_row.close_out_destination,
    'lastPriceUpdate',         v_row.last_price_update,
    'productName',             v_row.product_name,
    'manufacturer',            v_row.manufacturer,
    'avgAskPrice',             v_row.avg_ask_price,
    'avgReceivedPrice',        v_row.avg_received_price,
    'askReceivedRatio',        v_row.ask_received_ratio,
    'paymentSampleCount',      v_row.payment_sample_count,
    'aiConfidence',            v_row.ai_confidence,
    'manufacturerReliability', COALESCE(v_row.manufacturer_reliability, 'unknown'),
    'lastAskReceivedUpdate',   v_row.last_ask_received_update,
    'minReceivedPrice',        v_row.min_received_price,
    'maxReceivedPrice',        v_row.max_received_price,
    'last5Payments',           COALESCE(v_row.last_5_payments, '[]'::jsonb)
  );
END;
$function$;
