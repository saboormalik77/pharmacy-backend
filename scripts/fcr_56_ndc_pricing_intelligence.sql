-- ============================================================
-- FCR 56 — NDC Ask/Received Pricing Intelligence
--
-- Implements the AI-powered NDC pricing intelligence system
-- described in src/NDC_ASK_RECEIVED_FEATURE.txt.
--
-- Contents:
--   1. New columns on ndc_pricing (intelligence fields)
--   2. ndc_payment_history table   (one row per ask/received observation)
--   3. credit_memo_analysis table  (AI extraction audit trail)
--   4. _ndc_pricing_to_json — extended with intelligence fields
--   5. _ndc_reliability_label  — helper to bucket reliability
--   6. recompute_ndc_pricing_intelligence(ndc_normalized)
--   7. update_ndc_pricing_from_payment(ndc, ask, received, …)
--   8. get_ndc_pricing_intelligence(ndc)
--   9. resolve_ndc_price_with_intelligence(ndc)  [non-breaking; original RPC untouched]
--  10. record_credit_memo_analysis(debit_memo_id, …, ai_items jsonb)
--  11. bulk_seed_ndc_payment_history(records jsonb)
--
-- Safe to re-run (CREATE OR REPLACE / IF NOT EXISTS).
-- Run this in the Supabase SQL editor.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. New columns on ndc_pricing
--
-- Note: `manufacturer` is referenced by the original fcr_28 index
--       (idx_ndc_pricing_manufacturer) and by our new functions, but the
--       base CREATE TABLE in fcr_28 never added it. We defensively add it
--       here with IF NOT EXISTS so this migration works on databases where
--       the column was never created.
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.ndc_pricing
  ADD COLUMN IF NOT EXISTS manufacturer             TEXT,
  ADD COLUMN IF NOT EXISTS avg_ask_price            DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS avg_received_price       DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS ask_received_ratio       DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS payment_sample_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_confidence            DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS manufacturer_reliability TEXT,
  ADD COLUMN IF NOT EXISTS last_ask_received_update TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS min_received_price       DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS max_received_price       DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS last_5_payments          JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ndc_pricing_reliability_check'
  ) THEN
    ALTER TABLE public.ndc_pricing
      ADD CONSTRAINT ndc_pricing_reliability_check
      CHECK (
        manufacturer_reliability IS NULL
        OR manufacturer_reliability IN ('excellent','good','average','poor','unknown')
      );
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. ndc_payment_history — single observations per credit memo line item
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ndc_payment_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  ndc                 VARCHAR(20) NOT NULL,
  ndc_normalized      VARCHAR(11) NOT NULL,

  debit_memo_id       UUID REFERENCES public.debit_memos(id) ON DELETE SET NULL,

  ask_price           DECIMAL(12,2) NOT NULL,
  received_price     DECIMAL(12,2) NOT NULL,
  payment_ratio       DECIMAL(7,2)
    GENERATED ALWAYS AS (
      CASE WHEN ask_price > 0 THEN ROUND((received_price / ask_price) * 100, 2) ELSE NULL END
    ) STORED,

  manufacturer        TEXT,
  product_name        TEXT,
  pharmacy_name       TEXT,
  ask_date            DATE,
  receive_date        DATE,
  payment_method      TEXT,
  is_partial          BOOLEAN NOT NULL DEFAULT FALSE,
  percentage_returned DECIMAL(7,2),

  ai_extracted        BOOLEAN NOT NULL DEFAULT FALSE,
  ai_confidence       DECIMAL(5,2),

  source              TEXT NOT NULL DEFAULT 'manual',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nph_ndc_normalized   ON public.ndc_payment_history(ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_nph_debit_memo       ON public.ndc_payment_history(debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_nph_created_at_desc  ON public.ndc_payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nph_manufacturer     ON public.ndc_payment_history(manufacturer);

ALTER TABLE public.ndc_payment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_payment_history;
CREATE POLICY "Allow all access via service role" ON public.ndc_payment_history
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 3. credit_memo_analysis — audit trail of AI extractions
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credit_memo_analysis (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_memo_id       UUID REFERENCES public.debit_memos(id) ON DELETE CASCADE,
  credit_memo_url     TEXT,

  ai_status           TEXT NOT NULL DEFAULT 'completed'
    CHECK (ai_status IN ('pending','processing','completed','failed','manual_review')),
  ai_confidence       DECIMAL(5,2),
  ai_extracted_total  DECIMAL(12,2),
  ai_extracted_items  JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_error_message    TEXT,

  human_reviewed      BOOLEAN NOT NULL DEFAULT FALSE,
  human_approved      BOOLEAN,
  reviewed_by         UUID,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cma_debit_memo  ON public.credit_memo_analysis(debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_cma_status      ON public.credit_memo_analysis(ai_status);
CREATE INDEX IF NOT EXISTS idx_cma_created_at  ON public.credit_memo_analysis(created_at DESC);

ALTER TABLE public.credit_memo_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON public.credit_memo_analysis;
CREATE POLICY "Allow all access via service role" ON public.credit_memo_analysis
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 4. Helper: extended _ndc_pricing_to_json (adds intelligence fields)
--    Original signature unchanged; consumers ignore unknown fields.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._ndc_pricing_to_json(r public.ndc_pricing)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'ndc',                      r.ndc,
    'ndcNormalized',            r.ndc_normalized,
    'productName',              r.product_name,
    'manufacturer',             r.manufacturer,
    'currentPrice',             r.current_price,
    'lastPrice',                r.last_price,
    'estimatedStorePrice',      r.estimated_store_price,
    'lastReimbursement',        r.last_reimbursement,
    'priceSource',              r.price_source,
    'closeOutDestination',      r.close_out_destination,
    'lastPriceUpdate',          r.last_price_update,
    'createdBy',                r.created_by,
    'updatedBy',                r.updated_by,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at,
    -- FCR-56 intelligence
    'avgAskPrice',              r.avg_ask_price,
    'avgReceivedPrice',         r.avg_received_price,
    'askReceivedRatio',         r.ask_received_ratio,
    'paymentSampleCount',       r.payment_sample_count,
    'aiConfidence',             r.ai_confidence,
    'manufacturerReliability',  COALESCE(r.manufacturer_reliability, 'unknown'),
    'lastAskReceivedUpdate',    r.last_ask_received_update,
    'minReceivedPrice',         r.min_received_price,
    'maxReceivedPrice',         r.max_received_price,
    'last5Payments',            COALESCE(r.last_5_payments, '[]'::jsonb)
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Reliability bucket helper
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._ndc_reliability_label(
  p_ratio   NUMERIC,
  p_samples INTEGER
) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_samples IS NULL OR p_samples = 0 OR p_ratio IS NULL THEN 'unknown'
    WHEN p_ratio >= 90 AND p_samples >= 10 THEN 'excellent'
    WHEN p_ratio >= 80 AND p_samples >= 5  THEN 'good'
    WHEN p_ratio >= 65 AND p_samples >= 3  THEN 'average'
    ELSE 'poor'
  END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. recompute_ndc_pricing_intelligence
--    Recalculates aggregates for one NDC from ndc_payment_history,
--    upserts the ndc_pricing row if needed.
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

  -- Upsert into ndc_pricing
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
    -- backfill product / manufacturer ONLY if currently missing
    product_name = COALESCE(public.ndc_pricing.product_name, EXCLUDED.product_name),
    manufacturer = COALESCE(public.ndc_pricing.manufacturer, EXCLUDED.manufacturer);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_ndc_pricing_intelligence(TEXT)
  TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 7. update_ndc_pricing_from_payment
--    Inserts a single ask/received observation and recomputes aggregates.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_ndc_pricing_from_payment(
  p_ndc            TEXT,
  p_ask_price      DECIMAL,
  p_received_price DECIMAL,
  p_debit_memo_id  UUID    DEFAULT NULL,
  p_manufacturer   TEXT    DEFAULT NULL,
  p_product_name   TEXT    DEFAULT NULL,
  p_pharmacy_name  TEXT    DEFAULT NULL,
  p_ask_date       DATE    DEFAULT NULL,
  p_receive_date   DATE    DEFAULT NULL,
  p_payment_method TEXT    DEFAULT NULL,
  p_is_partial     BOOLEAN DEFAULT FALSE,
  p_percentage     DECIMAL DEFAULT NULL,
  p_ai_extracted   BOOLEAN DEFAULT FALSE,
  p_ai_confidence  DECIMAL DEFAULT NULL,
  p_source         TEXT    DEFAULT 'manual'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.update_ndc_pricing_from_payment(
  TEXT, DECIMAL, DECIMAL, UUID, TEXT, TEXT, TEXT, DATE, DATE, TEXT, BOOLEAN, DECIMAL, BOOLEAN, DECIMAL, TEXT
) TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 8. get_ndc_pricing_intelligence
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ndc_pricing_intelligence(p_ndc TEXT)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_ndc_pricing_intelligence(TEXT)
  TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 9. resolve_ndc_price_with_intelligence
--    Non-breaking: returns the same shape as resolve_ndc_price plus
--    intelligence fields. The original resolve_ndc_price RPC is left
--    untouched so existing scan flows that don't need intelligence
--    keep working.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resolve_ndc_price_with_intelligence(p_ndc TEXT)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.resolve_ndc_price_with_intelligence(TEXT)
  TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 10. record_credit_memo_analysis
--     Saves an AI extraction record and rolls each line item into
--     ndc_payment_history + recomputes aggregates.
--
-- p_ai_items shape (each element):
-- {
--   "ndc": "00185-0055-01",
--   "productName": "metolazone 5mg",
--   "askPrice": 179.03,
--   "receivedPrice": 49.04,
--   "manufacturer": "sandoz",
--   "isPartial": false,
--   "percentageReturned": 27.4,
--   "askDate": "2023-01-20",
--   "receiveDate": "2023-03-06",
--   "paymentMethod": "Direct+NDC"
-- }
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_credit_memo_analysis(
  p_debit_memo_id      UUID,
  p_credit_memo_url    TEXT,
  p_ai_status          TEXT,
  p_ai_confidence      DECIMAL,
  p_ai_extracted_total DECIMAL,
  p_ai_items           JSONB,
  p_ai_error_message   TEXT DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_analysis_id UUID;
  v_inserted    INTEGER := 0;
  v_skipped     INTEGER := 0;
  v_item        JSONB;
  v_norm        TEXT;
  v_distinct    JSONB := '[]'::jsonb;
  v_rec_ndcs    TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Persist the audit row first (so failures still leave a trace)
  INSERT INTO public.credit_memo_analysis (
    debit_memo_id, credit_memo_url,
    ai_status, ai_confidence, ai_extracted_total,
    ai_extracted_items, ai_error_message
  ) VALUES (
    p_debit_memo_id, p_credit_memo_url,
    COALESCE(p_ai_status, 'completed'),
    p_ai_confidence, p_ai_extracted_total,
    COALESCE(p_ai_items, '[]'::jsonb), p_ai_error_message
  )
  RETURNING id INTO v_analysis_id;

  IF p_ai_items IS NULL OR jsonb_typeof(p_ai_items) <> 'array' THEN
    RETURN jsonb_build_object(
      'error', false,
      'data', jsonb_build_object(
        'analysisId', v_analysis_id,
        'inserted',   0,
        'skipped',    0
      )
    );
  END IF;

  -- Walk each line item; insert into payment history if both prices present
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_ai_items) LOOP
    IF (v_item->>'ndc') IS NULL OR TRIM(v_item->>'ndc') = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    IF (v_item->>'askPrice') IS NULL OR (v_item->>'receivedPrice') IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_norm := LOWER(REPLACE(TRIM(v_item->>'ndc'), '-', ''));
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
      TRIM(v_item->>'ndc'), v_norm, p_debit_memo_id,
      (v_item->>'askPrice')::DECIMAL,
      (v_item->>'receivedPrice')::DECIMAL,
      NULLIF(TRIM(COALESCE(v_item->>'manufacturer', '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'productName',  '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'pharmacyName', '')), ''),
      NULLIF(v_item->>'askDate',     '')::DATE,
      NULLIF(v_item->>'receiveDate', '')::DATE,
      NULLIF(TRIM(COALESCE(v_item->>'paymentMethod', '')), ''),
      COALESCE((v_item->>'isPartial')::BOOLEAN, FALSE),
      NULLIF(v_item->>'percentageReturned', '')::DECIMAL,
      TRUE,
      COALESCE((v_item->>'aiConfidence')::DECIMAL, p_ai_confidence),
      'credit_memo_ai'
    );

    v_inserted := v_inserted + 1;
    IF NOT (v_norm = ANY(v_rec_ndcs)) THEN
      v_rec_ndcs := array_append(v_rec_ndcs, v_norm);
    END IF;
  END LOOP;

  -- Recompute aggregates once per distinct NDC touched
  IF array_length(v_rec_ndcs, 1) IS NOT NULL THEN
    FOR v_norm IN SELECT unnest(v_rec_ndcs) LOOP
      PERFORM public.recompute_ndc_pricing_intelligence(v_norm);
    END LOOP;
  END IF;

  v_distinct := COALESCE(to_jsonb(v_rec_ndcs), '[]'::jsonb);

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'analysisId',    v_analysis_id,
      'inserted',      v_inserted,
      'skipped',       v_skipped,
      'distinctNdcs',  v_distinct
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_credit_memo_analysis(
  UUID, TEXT, TEXT, DECIMAL, DECIMAL, JSONB, TEXT
) TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 11. bulk_seed_ndc_payment_history
--     Bulk-load historical observations (e.g. ask_vs_received.csv).
--     Skips records missing ask_price OR received_price (per user spec).
--     Recomputes aggregates once per distinct NDC at the end.
--
-- Each element of p_records:
-- {
--   "ndc": "00185-0055-01",
--   "productName": "metolazone 5mg",
--   "manufacturer": "sandoz",
--   "askPrice": 179.03,
--   "receivedPrice": 49.04,
--   "pharmacyName": "CureMed Pharmacy",
--   "askDate": "2023-01-20",
--   "receiveDate": "2023-03-06",
--   "paymentMethod": "Direct+NDC",
--   "isPartial": false,
--   "percentageReturned": 27.40,
--   "aiConfidence": 95.0
-- }
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bulk_seed_ndc_payment_history(p_records JSONB)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item     JSONB;
  v_norm     TEXT;
  v_inserted INTEGER := 0;
  v_skipped  INTEGER := 0;
  v_ndcs     TEXT[]  := ARRAY[]::TEXT[];
BEGIN
  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message',
      'p_records must be a JSONB array');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_records) LOOP
    IF (v_item->>'ndc') IS NULL OR TRIM(v_item->>'ndc') = ''
       OR (v_item->>'askPrice')      IS NULL OR (v_item->>'askPrice')      = ''
       OR (v_item->>'receivedPrice') IS NULL OR (v_item->>'receivedPrice') = ''
    THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_norm := LOWER(REPLACE(TRIM(v_item->>'ndc'), '-', ''));
    IF LENGTH(v_norm) < 10 THEN
      v_norm := LPAD(v_norm, 11, '0');
    END IF;

    INSERT INTO public.ndc_payment_history (
      ndc, ndc_normalized,
      ask_price, received_price,
      manufacturer, product_name, pharmacy_name,
      ask_date, receive_date, payment_method,
      is_partial, percentage_returned,
      ai_extracted, ai_confidence, source
    ) VALUES (
      TRIM(v_item->>'ndc'), v_norm,
      (v_item->>'askPrice')::DECIMAL,
      (v_item->>'receivedPrice')::DECIMAL,
      NULLIF(TRIM(COALESCE(v_item->>'manufacturer', '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'productName',  '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'pharmacyName', '')), ''),
      NULLIF(v_item->>'askDate',     '')::DATE,
      NULLIF(v_item->>'receiveDate', '')::DATE,
      NULLIF(TRIM(COALESCE(v_item->>'paymentMethod', '')), ''),
      COALESCE((v_item->>'isPartial')::BOOLEAN, FALSE),
      NULLIF(v_item->>'percentageReturned', '')::DECIMAL,
      FALSE,
      NULLIF(v_item->>'aiConfidence', '')::DECIMAL,
      'csv_seed'
    );

    v_inserted := v_inserted + 1;
    IF NOT (v_norm = ANY(v_ndcs)) THEN
      v_ndcs := array_append(v_ndcs, v_norm);
    END IF;
  END LOOP;

  IF array_length(v_ndcs, 1) IS NOT NULL THEN
    FOR v_norm IN SELECT unnest(v_ndcs) LOOP
      PERFORM public.recompute_ndc_pricing_intelligence(v_norm);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inserted',     v_inserted,
      'skipped',      v_skipped,
      'distinctNdcs', COALESCE(array_length(v_ndcs, 1), 0)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_seed_ndc_payment_history(JSONB)
  TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- Done. Next: run scripts/fcr_56_seed_ndc_payment_history.sql to
-- bulk-load historical observations from ask_vs_received.csv.
-- ────────────────────────────────────────────────────────────
