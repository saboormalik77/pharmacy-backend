-- Function : recompute_ndc_pricing_intelligence
-- Arguments: p_ndc_normalized text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.recompute_ndc_pricing_intelligence(p_ndc_normalized text) CASCADE;

CREATE OR REPLACE FUNCTION public.recompute_ndc_pricing_intelligence(p_ndc_normalized text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ndc_raw    TEXT;
  v_avg_ask    DECIMAL(12,2);
  v_avg_recv   DECIMAL(12,2);
  v_ratio      DECIMAL(7,2);
  v_count      INTEGER;
  v_min_recv   DECIMAL(12,2);
  v_max_recv   DECIMAL(12,2);
  v_avg_conf   DECIMAL(5,2);
  v_last5      JSONB;
  v_last_at    TIMESTAMPTZ;
  v_reliab     TEXT;
  v_product    TEXT;
  v_mfr        TEXT;
BEGIN
  IF p_ndc_normalized IS NULL OR p_ndc_normalized = '' THEN RETURN; END IF;

  SELECT
    AVG(ask_price)::DECIMAL(12,2),
    AVG(received_price)::DECIMAL(12,2),
    CASE WHEN AVG(ask_price) > 0
         THEN ROUND((AVG(received_price) / AVG(ask_price)) * 100, 2)
         ELSE NULL END,
    COUNT(*),
    MIN(received_price)::DECIMAL(12,2),
    MAX(received_price)::DECIMAL(12,2),
    AVG(ai_confidence)::DECIMAL(5,2),
    MAX(ndc),
    MAX(created_at),
    MAX(product_name),
    MAX(manufacturer)
  INTO
    v_avg_ask, v_avg_recv, v_ratio, v_count,
    v_min_recv, v_max_recv, v_avg_conf,
    v_ndc_raw, v_last_at, v_product, v_mfr
  FROM public.ndc_payment_history
  WHERE ndc_normalized = p_ndc_normalized;

  IF v_count = 0 OR v_count IS NULL THEN RETURN; END IF;

  -- Build last5: most recent 5 payments
  SELECT COALESCE(jsonb_agg(p ORDER BY rn), '[]'::jsonb)
  INTO v_last5
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn,
      jsonb_build_object(
        'askPrice',      ask_price,
        'receivedPrice', received_price,
        'ratio',         payment_ratio,
        'manufacturer',  manufacturer,
        'productName',   product_name,
        'pharmacyName',  pharmacy_name,
        'askDate',       ask_date,
        'receiveDate',   receive_date,
        'aiExtracted',   ai_extracted,
        'createdAt',     created_at
      ) AS p
    FROM public.ndc_payment_history
    WHERE ndc_normalized = p_ndc_normalized
    ORDER BY created_at DESC
    LIMIT 5
  ) t;

  v_reliab := public._ndc_reliability_label(v_ratio, v_count);

  -- Upsert intelligence fields into ndc_pricing
  INSERT INTO public.ndc_pricing (
    ndc, ndc_normalized, product_name, manufacturer,
    avg_ask_price, avg_received_price, ask_received_ratio,
    payment_sample_count, ai_confidence, manufacturer_reliability,
    last_ask_received_update, min_received_price, max_received_price,
    last_5_payments
  ) VALUES (
    v_ndc_raw, p_ndc_normalized, v_product, v_mfr,
    v_avg_ask, v_avg_recv, v_ratio,
    v_count, v_avg_conf, v_reliab,
    v_last_at, v_min_recv, v_max_recv,
    v_last5
  )
  ON CONFLICT (ndc_normalized) DO UPDATE SET
    avg_ask_price            = EXCLUDED.avg_ask_price,
    avg_received_price       = EXCLUDED.avg_received_price,
    ask_received_ratio       = EXCLUDED.ask_received_ratio,
    payment_sample_count     = EXCLUDED.payment_sample_count,
    ai_confidence            = EXCLUDED.ai_confidence,
    manufacturer_reliability = EXCLUDED.manufacturer_reliability,
    last_ask_received_update = EXCLUDED.last_ask_received_update,
    min_received_price       = EXCLUDED.min_received_price,
    max_received_price       = EXCLUDED.max_received_price,
    last_5_payments          = EXCLUDED.last_5_payments,
    product_name = COALESCE(public.ndc_pricing.product_name, EXCLUDED.product_name),
    manufacturer = COALESCE(public.ndc_pricing.manufacturer, EXCLUDED.manufacturer);

  -- ── FCR-56d: propagate new avg_ask_price → standard_price ────────────────
  -- Unconditional sync: standard_price must always equal avg_ask_price,
  -- so we update ALL items with this NDC every time the average changes.
  -- Use the same GUC escape hatch as admin_set_item_standard_price so the
  -- prevent_locked_return_item_updates trigger allows this write.
  IF v_avg_ask IS NOT NULL AND v_avg_ask > 0 THEN
    PERFORM set_config('app.allow_admin_price_update', 'true', true);

    UPDATE public.return_transaction_items
    SET    standard_price = v_avg_ask,
           estimated_value = CASE
             WHEN COALESCE(is_partial, FALSE) AND partial_percentage IS NOT NULL
             THEN ROUND(v_avg_ask * COALESCE(quantity, 1) * (partial_percentage / 100), 2)
             ELSE ROUND(v_avg_ask * COALESCE(quantity, 1), 2)
           END,
           updated_at = NOW()
    WHERE  LOWER(REPLACE(TRIM(COALESCE(ndc, '')), '-', '')) = p_ndc_normalized;

    PERFORM set_config('app.allow_admin_price_update', 'false', true);
  END IF;
END;
$function$;
