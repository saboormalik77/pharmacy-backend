-- Function : update_ndc_pricing_from_payment
-- Arguments: p_ndc text, p_ask_price numeric, p_received_price numeric, p_debit_memo_id uuid, p_manufacturer text, p_product_name text, p_pharmacy_name text, p_ask_date date, p_receive_date date, p_payment_method text, p_is_partial boolean, p_percentage numeric, p_ai_extracted boolean, p_ai_confidence numeric, p_source text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_ndc_pricing_from_payment(p_ndc text, p_ask_price numeric, p_received_price numeric, p_debit_memo_id uuid, p_manufacturer text, p_product_name text, p_pharmacy_name text, p_ask_date date, p_receive_date date, p_payment_method text, p_is_partial boolean, p_percentage numeric, p_ai_extracted boolean, p_ai_confidence numeric, p_source text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_ndc_pricing_from_payment(p_ndc text, p_ask_price numeric, p_received_price numeric, p_debit_memo_id uuid DEFAULT NULL::uuid, p_manufacturer text DEFAULT NULL::text, p_product_name text DEFAULT NULL::text, p_pharmacy_name text DEFAULT NULL::text, p_ask_date date DEFAULT NULL::date, p_receive_date date DEFAULT NULL::date, p_payment_method text DEFAULT NULL::text, p_is_partial boolean DEFAULT false, p_percentage numeric DEFAULT NULL::numeric, p_ai_extracted boolean DEFAULT false, p_ai_confidence numeric DEFAULT NULL::numeric, p_source text DEFAULT 'manual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_norm   TEXT;
  v_row    public.ndc_payment_history;
BEGIN
  IF p_ndc IS NULL OR TRIM(p_ndc) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'NDC is required');
  END IF;
  IF p_ask_price IS NULL OR p_received_price IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Both ask_price and received_price are required');
  END IF;

  v_norm := LOWER(REPLACE(TRIM(p_ndc), '-', ''));
  IF LENGTH(v_norm) < 10 THEN
    v_norm := LPAD(v_norm, 11, '0');
  END IF;

  INSERT INTO public.ndc_payment_history (
    ndc, ndc_normalized, debit_memo_id,
    ask_price, received_price,
    manufacturer, product_name, pharmacy_name,
    ask_date, receive_date, payment_method,
    is_partial, percentage_returned,
    ai_extracted, ai_confidence, source
  ) VALUES (
    TRIM(p_ndc), v_norm, p_debit_memo_id,
    p_ask_price, p_received_price,
    NULLIF(TRIM(COALESCE(p_manufacturer, '')), ''),
    NULLIF(TRIM(COALESCE(p_product_name,  '')), ''),
    NULLIF(TRIM(COALESCE(p_pharmacy_name, '')), ''),
    p_ask_date, p_receive_date,
    NULLIF(TRIM(COALESCE(p_payment_method, '')), ''),
    COALESCE(p_is_partial, FALSE), p_percentage,
    COALESCE(p_ai_extracted, FALSE), p_ai_confidence,
    COALESCE(NULLIF(TRIM(p_source), ''), 'manual')
  )
  RETURNING * INTO v_row;

  PERFORM public.recompute_ndc_pricing_intelligence(v_norm);

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'paymentHistoryId', v_row.id,
      'ndcNormalized',    v_row.ndc_normalized,
      'paymentRatio',     v_row.payment_ratio
    )
  );
END;
$function$;
