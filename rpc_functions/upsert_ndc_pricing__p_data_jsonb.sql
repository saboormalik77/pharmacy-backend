-- Function : upsert_ndc_pricing
-- Arguments: p_data jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.upsert_ndc_pricing(p_data jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.upsert_ndc_pricing(p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ndc             TEXT;
  v_ndc_normalized  TEXT;
  v_row             ndc_pricing;
  v_current_price   DECIMAL(12,2);
  v_product_name    TEXT;
BEGIN
  v_ndc := TRIM(p_data->>'ndc');
  IF v_ndc IS NULL OR v_ndc = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'NDC code is required');
  END IF;

  v_ndc_normalized := LOWER(REPLACE(v_ndc, '-', ''));
  IF LENGTH(v_ndc_normalized) < 10 THEN
    v_ndc_normalized := LPAD(v_ndc_normalized, 11, '0');
  END IF;

  v_current_price := (p_data->>'currentPrice')::DECIMAL;
  v_product_name  := NULLIF(TRIM(p_data->>'productName'), '');

  INSERT INTO ndc_pricing (
    ndc, ndc_normalized, product_name,
    current_price, last_price, estimated_store_price, last_reimbursement,
    price_source, close_out_destination,
    last_price_update, created_by, updated_by
  ) VALUES (
    v_ndc,
    v_ndc_normalized,
    v_product_name,
    v_current_price,
    NULL,
    (p_data->>'estimatedStorePrice')::DECIMAL,
    (p_data->>'lastReimbursement')::DECIMAL,
    NULLIF(TRIM(p_data->>'priceSource'), ''),
    NULLIF(TRIM(p_data->>'closeOutDestination'), ''),
    COALESCE((p_data->>'lastPriceUpdate')::TIMESTAMPTZ, NOW()),
    (p_data->>'userId')::UUID,
    (p_data->>'userId')::UUID
  )
  ON CONFLICT (ndc_normalized) DO UPDATE SET
    ndc                  = COALESCE(NULLIF(TRIM(EXCLUDED.ndc), ''), ndc_pricing.ndc),
    product_name         = COALESCE(NULLIF(TRIM(EXCLUDED.product_name), ''), ndc_pricing.product_name),
    last_price           = ndc_pricing.current_price,
    current_price        = COALESCE(EXCLUDED.current_price, ndc_pricing.current_price),
    estimated_store_price = COALESCE(EXCLUDED.estimated_store_price, ndc_pricing.estimated_store_price),
    last_reimbursement   = COALESCE(EXCLUDED.last_reimbursement, ndc_pricing.last_reimbursement),
    price_source         = COALESCE(NULLIF(TRIM(EXCLUDED.price_source), ''), ndc_pricing.price_source),
    close_out_destination = COALESCE(NULLIF(TRIM(EXCLUDED.close_out_destination), ''), ndc_pricing.close_out_destination),
    last_price_update    = COALESCE(EXCLUDED.last_price_update, NOW()),
    updated_by           = EXCLUDED.updated_by
  RETURNING * INTO v_row;

  -- ── FCR-56d: seed avg_ask immediately when a real price is provided ───────
  -- Maintain a single "manual_book_entry" seed row per NDC, refreshed on every
  -- admin price change so old values don't permanently skew the average.
  -- ask = received = currentPrice gives a 100% ratio seed until real
  -- credit-memo data arrives and corrects it via recompute.
  IF v_current_price IS NOT NULL AND v_current_price > 0 THEN
    -- Remove any previous manual seed for this NDC (allows price corrections)
    DELETE FROM public.ndc_payment_history
    WHERE  ndc_normalized = v_ndc_normalized
      AND  source = 'manual_book_entry';

    INSERT INTO public.ndc_payment_history (
      ndc, ndc_normalized, ask_price, received_price,
      product_name, source, ai_extracted
    ) VALUES (
      v_ndc, v_ndc_normalized,
      v_current_price, v_current_price,
      v_product_name, 'manual_book_entry', FALSE
    );

    -- Recompute intelligence (which also propagates to standard_price)
    PERFORM public.recompute_ndc_pricing_intelligence(v_ndc_normalized);
  END IF;

  RETURN jsonb_build_object('error', false, 'data', _ndc_pricing_to_json(v_row));
END;
$function$;
