-- FCR-56d: Keep standard_price in sync with avg_ask_price
--
-- Goals
-- ─────
-- 1. recompute_ndc_pricing_intelligence  → after updating avg_ask_price on
--    ndc_pricing, propagate that value to return_transaction_items.standard_price
--    for every item whose ndc_normalized matches (only where standard_price is 0
--    or NULL — never overwrite a real previously-set price with a worse estimate).
--
-- 2. upsert_ndc_pricing (manual book entry) → when an admin saves a price for
--    the first time (currentPrice > 0), immediately insert that value as an
--    avg-ask observation in ndc_payment_history so the intelligence pipeline
--    has a seed, then propagate to standard_price on existing items with that NDC.
--
-- 3. Backfill script → one-time UPDATE to fill every return_transaction_items row
--    where standard_price = 0 (or NULL) from the matching ndc_pricing.avg_ask_price.
--
-- Run order: fcr_56_ndc_pricing_intelligence.sql must already be applied.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Extend recompute_ndc_pricing_intelligence:
--    After upserting avg_ask_price, push it to standard_price
--    on all return_transaction_items with this NDC that still
--    have standard_price = 0 or NULL.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recompute_ndc_pricing_intelligence(
  p_ndc_normalized TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.recompute_ndc_pricing_intelligence(TEXT)
  TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 2. Extend upsert_ndc_pricing:
--    When an admin saves a new / updated current_price > 0,
--    (a) seed ndc_payment_history with ask=currentPrice, received=currentPrice
--        so avg_ask_price gets an immediate value, and
--    (b) propagate avg_ask_price → standard_price on items with no price yet.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_ndc_pricing(p_data JSONB)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

GRANT EXECUTE ON FUNCTION upsert_ndc_pricing TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 3. Backfill: one-time UPDATE for existing items
--    Sets standard_price = avg_ask_price for every
--    return_transaction_items row where standard_price is
--    NULL or 0 and the NDC has an avg_ask_price in ndc_pricing.
--    Items that already have a real standard_price are NOT touched.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE v_count INTEGER;
BEGIN
  -- Allow writing standard_price on locked ("received") returns via the same
  -- GUC escape hatch used by admin_set_item_standard_price.
  PERFORM set_config('app.allow_admin_price_update', 'true', true);

  UPDATE public.return_transaction_items rti
  SET    standard_price = np.avg_ask_price,
         estimated_value = CASE
           WHEN COALESCE(rti.is_partial, FALSE) AND rti.partial_percentage IS NOT NULL
           THEN ROUND(np.avg_ask_price * COALESCE(rti.quantity, 1) * (rti.partial_percentage / 100), 2)
           ELSE ROUND(np.avg_ask_price * COALESCE(rti.quantity, 1), 2)
         END,
         updated_at = NOW()
  FROM   public.ndc_pricing np
  WHERE  LOWER(REPLACE(TRIM(COALESCE(rti.ndc, '')), '-', '')) = np.ndc_normalized
    AND  np.avg_ask_price IS NOT NULL
    AND  np.avg_ask_price > 0
    AND  (rti.standard_price IS NULL OR rti.standard_price = 0);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'FCR-56d backfill: % return_transaction_items rows updated with avg_ask_price', v_count;

  PERFORM set_config('app.allow_admin_price_update', 'false', true);
END;
$$;
