-- ============================================================
-- FCR — NDC Pricing Book (Price Master)
-- The single source of truth for NDC pricing in the system.
-- Admins & processors can create / update / search entries.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ndc_pricing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NDC identification
  ndc             VARCHAR(20) NOT NULL,
  ndc_normalized  VARCHAR(11) NOT NULL,

  -- Optional product reference (for display purposes only)
  product_name      TEXT, -- Optional: for easier identification in UI

  -- Pricing
  current_price         DECIMAL(12,2),
  last_price            DECIMAL(12,2),
  estimated_store_price DECIMAL(12,2),
  last_reimbursement    DECIMAL(12,2),

  -- Source & destination
  price_source    TEXT,
  close_out_destination TEXT CHECK (
    close_out_destination IS NULL
    OR close_out_destination IN ('inmar','qualanex','pharmalink','other')
  ),

  -- Metadata
  last_price_update TIMESTAMPTZ,
  created_by        UUID,
  updated_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ndc_pricing_normalized
  ON ndc_pricing(ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc
  ON ndc_pricing(ndc);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_product_name
  ON ndc_pricing USING gin(to_tsvector('english', COALESCE(product_name, '')));
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_manufacturer
  ON ndc_pricing(manufacturer);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_updated
  ON ndc_pricing(updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ndc_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ndc_pricing_updated_at ON ndc_pricing;
CREATE TRIGGER trg_ndc_pricing_updated_at
  BEFORE UPDATE ON ndc_pricing
  FOR EACH ROW EXECUTE FUNCTION update_ndc_pricing_updated_at();

-- RLS
ALTER TABLE ndc_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON ndc_pricing;
CREATE POLICY "Allow all access via service role" ON ndc_pricing
  FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- 2. HELPER: build a pricing JSON object
-- ============================================================

CREATE OR REPLACE FUNCTION _ndc_pricing_to_json(r ndc_pricing)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                   r.id,
    'ndc',                  r.ndc,
    'ndcNormalized',        r.ndc_normalized,
    'productName',          r.product_name,
    'currentPrice',         r.current_price,
    'lastPrice',            r.last_price,
    'estimatedStorePrice',  r.estimated_store_price,
    'lastReimbursement',    r.last_reimbursement,
    'priceSource',          r.price_source,
    'closeOutDestination',  r.close_out_destination,
    'lastPriceUpdate',      r.last_price_update,
    'createdBy',            r.created_by,
    'updatedBy',            r.updated_by,
    'createdAt',            r.created_at,
    'updatedAt',            r.updated_at
  );
$$;


-- ============================================================
-- 3. UPSERT (create or update)
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_ndc_pricing(p_data JSONB)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ndc             TEXT;
  v_ndc_normalized  TEXT;
  v_row             ndc_pricing;
BEGIN
  v_ndc := TRIM(p_data->>'ndc');
  IF v_ndc IS NULL OR v_ndc = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'NDC code is required');
  END IF;

  v_ndc_normalized := LOWER(REPLACE(v_ndc, '-', ''));
  IF LENGTH(v_ndc_normalized) < 10 THEN
    v_ndc_normalized := LPAD(v_ndc_normalized, 11, '0');
  END IF;

  INSERT INTO ndc_pricing (
    ndc, ndc_normalized, product_name,
    current_price, last_price, estimated_store_price, last_reimbursement,
    price_source, close_out_destination,
    last_price_update, created_by, updated_by
  ) VALUES (
    v_ndc,
    v_ndc_normalized,
    NULLIF(TRIM(p_data->>'productName'), ''),
    (p_data->>'currentPrice')::DECIMAL,
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

  RETURN jsonb_build_object('error', false, 'data', _ndc_pricing_to_json(v_row));
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_ndc_pricing TO authenticated, anon, service_role;


-- ============================================================
-- 4. GET by NDC (exact match, supports dashed or undashed)
-- ============================================================

CREATE OR REPLACE FUNCTION get_ndc_pricing(p_ndc TEXT)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
$$;

GRANT EXECUTE ON FUNCTION get_ndc_pricing TO authenticated, anon, service_role;


-- ============================================================
-- 5. SEARCH (paginated, by NDC prefix or product name)
-- ============================================================

CREATE OR REPLACE FUNCTION search_ndc_pricing_book(
  p_search  TEXT DEFAULT '',
  p_page    INTEGER DEFAULT 1,
  p_limit   INTEGER DEFAULT 25,
  p_sort_by TEXT DEFAULT 'updated_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_search   TEXT;
  v_offset   INTEGER;
  v_total    INTEGER;
  v_items    jsonb;
  v_sort_col TEXT;
  v_sort_dir TEXT;
BEGIN
  v_search := LOWER(REPLACE(TRIM(COALESCE(p_search, '')), '-', ''));
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  v_sort_col := CASE p_sort_by
    WHEN 'ndc' THEN 'ndc_normalized'
    WHEN 'productName' THEN 'product_name'
    WHEN 'manufacturer' THEN 'manufacturer'
    WHEN 'currentPrice' THEN 'current_price'
    WHEN 'updatedAt' THEN 'updated_at'
    ELSE 'updated_at'
  END;
  v_sort_dir := CASE WHEN LOWER(p_sort_order) = 'asc' THEN 'ASC' ELSE 'DESC' END;

  IF v_search = '' THEN
    SELECT COUNT(*) INTO v_total FROM ndc_pricing;

    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(_ndc_pricing_to_json(t)), ''[]''::jsonb)
       FROM (SELECT * FROM ndc_pricing ORDER BY %I %s LIMIT $1 OFFSET $2) t',
      v_sort_col, v_sort_dir
    ) INTO v_items USING p_limit, v_offset;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM ndc_pricing
      WHERE ndc_normalized LIKE v_search || '%'
         OR LOWER(product_name) LIKE '%' || v_search || '%';

    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(_ndc_pricing_to_json(t)), ''[]''::jsonb)
       FROM (
         SELECT * FROM ndc_pricing
         WHERE ndc_normalized LIKE $3 || ''%%''
            OR LOWER(product_name) LIKE ''%%'' || $3 || ''%%''
         ORDER BY %I %s
         LIMIT $1 OFFSET $2
       ) t',
      v_sort_col, v_sort_dir
    ) INTO v_items USING p_limit, v_offset, v_search;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'items', COALESCE(v_items, '[]'::jsonb),
      'pagination', jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total,
        'totalPages', CEIL(v_total::DECIMAL / p_limit)
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION search_ndc_pricing_book TO authenticated, anon, service_role;


-- ============================================================
-- 6. DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION delete_ndc_pricing(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM ndc_pricing WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'NDC pricing not found');
  END IF;
  RETURN jsonb_build_object('error', false, 'message', 'Deleted successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION delete_ndc_pricing TO authenticated, anon, service_role;


-- ============================================================
-- 7. RESOLVE PRICE  (priority: line-item → price book → null)
--    Called by the item-add workflow to auto-populate pricing.
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_ndc_price(p_ndc TEXT)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
    RETURN jsonb_build_object(
      'found', false,
      'currentPrice', NULL,
      'estimatedStorePrice', NULL,
      'priceSource', NULL,
      'closeOutDestination', NULL
    );
  END IF;

    RETURN jsonb_build_object(
      'found', true,
      'currentPrice',         v_row.current_price,
      'estimatedStorePrice',  v_row.estimated_store_price,
      'priceSource',          v_row.price_source,
      'closeOutDestination',  v_row.close_out_destination,
      'lastPriceUpdate',      v_row.last_price_update,
      'productName',          v_row.product_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_ndc_price TO authenticated, anon, service_role;


-- ============================================================
-- 8. IMPORT from return_reports into the price book
--    Seeds / updates ndc_pricing from existing return_reports data.
--    Takes the latest pricePerUnit per NDC across all reports.
-- ============================================================

CREATE OR REPLACE FUNCTION import_ndc_pricing_from_reports(p_user_id UUID DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_imported INTEGER := 0;
  v_updated  INTEGER := 0;
  rec        RECORD;
BEGIN
  FOR rec IN
    WITH latest_per_ndc AS (
      SELECT DISTINCT ON (ndc_norm)
        COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_raw,
        LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) AS ndc_norm,
        COALESCE(
          NULLIF(TRIM(rr.data->>'itemName'), ''),
          NULLIF(TRIM(rr.data->>'productName'), '')
        ) AS product_name,
        (rr.data->>'pricePerUnit')::DECIMAL AS price,
        COALESCE(ud.report_date::TIMESTAMPTZ, rr.created_at) AS report_ts
      FROM return_reports rr
      LEFT JOIN uploaded_documents ud ON rr.document_id = ud.id
      WHERE COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') IS NOT NULL
        AND TRIM(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', '')) != ''
        AND (rr.data->>'pricePerUnit')::DECIMAL > 0
      ORDER BY ndc_norm, COALESCE(ud.report_date::TIMESTAMPTZ, rr.created_at) DESC
    )
    SELECT * FROM latest_per_ndc
    WHERE LENGTH(ndc_norm) >= 10
  LOOP
    INSERT INTO ndc_pricing (
      ndc, ndc_normalized, product_name,
      current_price, price_source, last_price_update,
      created_by, updated_by
    ) VALUES (
      rec.ndc_raw, rec.ndc_norm, rec.product_name,
      rec.price, 'Imported from Return Reports', rec.report_ts,
      p_user_id, p_user_id
    )
    ON CONFLICT (ndc_normalized) DO UPDATE SET
      product_name      = COALESCE(NULLIF(TRIM(EXCLUDED.product_name), ''), ndc_pricing.product_name),
      last_price        = ndc_pricing.current_price,
      current_price     = CASE
                            WHEN EXCLUDED.last_price_update > COALESCE(ndc_pricing.last_price_update, '1970-01-01'::TIMESTAMPTZ)
                            THEN EXCLUDED.current_price
                            ELSE ndc_pricing.current_price
                          END,
      last_price_update = GREATEST(EXCLUDED.last_price_update, ndc_pricing.last_price_update),
      updated_by        = COALESCE(p_user_id, ndc_pricing.updated_by);

    IF FOUND THEN
      v_imported := v_imported + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object('imported', v_imported)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION import_ndc_pricing_from_reports TO authenticated, anon, service_role;
