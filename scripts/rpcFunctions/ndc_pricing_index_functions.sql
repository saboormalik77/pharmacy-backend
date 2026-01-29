-- ============================================================
-- NDC PRICING INDEX - Fast Search Solution
-- UPDATED: Now matches /api/optimization/recommendations exactly
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- HELPER FUNCTION: Safely extract JSON value (handles invalid JSON)
-- ============================================================
CREATE OR REPLACE FUNCTION safe_json_extract(json_data JSONB, key_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF json_data IS NULL THEN
    RETURN '';
  END IF;
  RETURN COALESCE(json_data->>key_name, '');
EXCEPTION WHEN OTHERS THEN
  RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper to build location string from address JSONB
CREATE OR REPLACE FUNCTION safe_get_location(address_data JSONB)
RETURNS TEXT AS $$
DECLARE
  v_city TEXT;
  v_state TEXT;
BEGIN
  IF address_data IS NULL THEN
    RETURN '';
  END IF;
  
  v_city := COALESCE(address_data->>'city', '');
  v_state := COALESCE(address_data->>'state', '');
  
  IF v_city = '' AND v_state = '' THEN
    RETURN '';
  ELSIF v_state = '' THEN
    RETURN v_city;
  ELSIF v_city = '' THEN
    RETURN v_state;
  ELSE
    RETURN v_city || ', ' || v_state;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 1. DROP AND RECREATE TABLE (to ensure clean state)
-- ============================================================

DROP TABLE IF EXISTS ndc_pricing_index CASCADE;

CREATE TABLE ndc_pricing_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- NDC Information (matching optimization service)
  ndc_original VARCHAR(50) NOT NULL,        -- Original NDC with dashes
  ndc_normalized VARCHAR(20) NOT NULL,      -- NDC without dashes (for search)
  product_name TEXT,                         -- itemName from return_reports.data
  
  -- Distributor Information  
  distributor_id UUID REFERENCES reverse_distributors(id) ON DELETE CASCADE,
  distributor_name VARCHAR(255),
  distributor_email VARCHAR(255),
  distributor_phone VARCHAR(50),
  distributor_location TEXT,
  
  -- Pricing - matches optimization service calculation
  -- price_per_unit = creditAmount / quantity (when quantity > 0)
  price_per_unit DECIMAL(12,4),
  credit_amount DECIMAL(12,4),
  quantity INTEGER,
  
  -- Full/Partial tracking (for unit type filtering)
  full_count INTEGER DEFAULT 0,
  partial_count INTEGER DEFAULT 0,
  
  -- Metadata
  source_report_id UUID REFERENCES return_reports(id) ON DELETE SET NULL,
  report_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique: one record per NDC-distributor-unit_type combination
  UNIQUE(ndc_normalized, distributor_id, full_count, partial_count)
);

-- ============================================================
-- 2. INDEXES FOR FAST SEARCH
-- ============================================================

CREATE INDEX idx_ndc_pricing_ndc_normalized ON ndc_pricing_index(ndc_normalized);
CREATE INDEX idx_ndc_pricing_ndc_original ON ndc_pricing_index(ndc_original);
CREATE INDEX idx_ndc_pricing_ndc_trgm ON ndc_pricing_index USING gin(ndc_normalized gin_trgm_ops);
CREATE INDEX idx_ndc_pricing_ndc_orig_trgm ON ndc_pricing_index USING gin(ndc_original gin_trgm_ops);
CREATE INDEX idx_ndc_pricing_product_trgm ON ndc_pricing_index USING gin(product_name gin_trgm_ops);
CREATE INDEX idx_ndc_pricing_distributor ON ndc_pricing_index(distributor_id);
CREATE INDEX idx_ndc_pricing_updated ON ndc_pricing_index(updated_at DESC);
CREATE INDEX idx_ndc_pricing_report_date ON ndc_pricing_index(report_date DESC);

-- ============================================================
-- 3. SEARCH FUNCTION - Returns SAME format as optimization API
-- ============================================================

CREATE OR REPLACE FUNCTION search_ndc_pricing(
  p_search TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_normalized TEXT;
  v_results JSONB;
  v_count INTEGER;
BEGIN
  -- Return empty if search is too short
  IF p_search IS NULL OR LENGTH(TRIM(p_search)) < 2 THEN
    RETURN jsonb_build_object(
      'results', '[]'::jsonb,
      'count', 0,
      'searchTerm', p_search
    );
  END IF;

  -- Normalize search (remove dashes, lowercase)
  v_search_normalized := LOWER(REPLACE(TRIM(p_search), '-', ''));
  
  -- Search and build response matching optimization API format
  WITH matched_ndcs AS (
    SELECT DISTINCT ON (p.ndc_normalized)
      p.ndc_original,
      p.ndc_normalized,
      p.product_name
    FROM ndc_pricing_index p
    WHERE 
      p.ndc_normalized ILIKE '%' || v_search_normalized || '%'
      OR p.ndc_original ILIKE '%' || p_search || '%'
      OR p.product_name ILIKE '%' || p_search || '%'
    ORDER BY 
      p.ndc_normalized,
      CASE 
        WHEN p.ndc_normalized = v_search_normalized THEN 0
        WHEN p.ndc_normalized LIKE v_search_normalized || '%' THEN 1
        ELSE 2
      END,
      p.report_date DESC NULLS LAST
    LIMIT p_limit
  ),
  results_with_distributors AS (
    SELECT 
      m.ndc_original,
      m.ndc_normalized,
      m.product_name,
      (
        -- Get distributors with their LATEST prices (matching optimization API)
        SELECT jsonb_agg(dist_data ORDER BY dist_data->>'fullPrice' DESC NULLS LAST)
        FROM (
          SELECT DISTINCT ON (d.distributor_id)
            jsonb_build_object(
              'id', d.distributor_id,
              'name', d.distributor_name,
              -- fullPrice: price from records where full > 0 and partial = 0
              'fullPrice', COALESCE(
                (SELECT price_per_unit FROM ndc_pricing_index 
                 WHERE ndc_normalized = m.ndc_normalized 
                   AND distributor_id = d.distributor_id 
                   AND full_count > 0 AND partial_count = 0
                 ORDER BY report_date DESC NULLS LAST LIMIT 1), 0
              ),
              -- partialPrice: price from records where partial > 0 and full = 0
              'partialPrice', COALESCE(
                (SELECT price_per_unit FROM ndc_pricing_index 
                 WHERE ndc_normalized = m.ndc_normalized 
                   AND distributor_id = d.distributor_id 
                   AND partial_count > 0 AND full_count = 0
                 ORDER BY report_date DESC NULLS LAST LIMIT 1), 0
              ),
              'email', d.distributor_email,
              'phone', d.distributor_phone,
              'location', d.distributor_location,
              'reportDate', d.report_date
            ) AS dist_data
          FROM ndc_pricing_index d
          WHERE d.ndc_normalized = m.ndc_normalized
          ORDER BY d.distributor_id, d.report_date DESC NULLS LAST
        ) sub
      ) AS distributors,
      -- Best full price (highest among all distributors)
      (
        SELECT MAX(price_per_unit) FROM ndc_pricing_index 
        WHERE ndc_normalized = m.ndc_normalized 
          AND full_count > 0 AND partial_count = 0
          AND price_per_unit > 0
      ) AS best_full_price,
      -- Best partial price (highest among all distributors)
      (
        SELECT MAX(price_per_unit) FROM ndc_pricing_index 
        WHERE ndc_normalized = m.ndc_normalized 
          AND partial_count > 0 AND full_count = 0
          AND price_per_unit > 0
      ) AS best_partial_price
    FROM matched_ndcs m
  )
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'ndc', r.ndc_original,
        'ndcNormalized', r.ndc_normalized,
        'productName', r.product_name,
        'distributors', COALESCE(r.distributors, '[]'::jsonb),
        'bestFullPrice', COALESCE(r.best_full_price, 0),
        'bestPartialPrice', COALESCE(r.best_partial_price, 0),
        -- Include fields matching Recommendation interface
        'recommendedDistributor', COALESCE(
          (r.distributors->0->>'name'), 'Unknown'
        ),
        'recommendedDistributorId', (r.distributors->0->>'id'),
        'fullPricePerUnit', COALESCE(r.best_full_price, 0),
        'partialPricePerUnit', COALESCE(r.best_partial_price, 0),
        'alternativeDistributors', COALESCE(
          (SELECT jsonb_agg(d) FROM jsonb_array_elements(r.distributors) d WHERE d != r.distributors->0),
          '[]'::jsonb
        )
      )
    ), '[]'::jsonb),
    COUNT(*)::INTEGER
  INTO v_results, v_count
  FROM results_with_distributors r;
  
  RETURN jsonb_build_object(
    'results', v_results,
    'count', v_count,
    'searchTerm', p_search
  );
END;
$$;

-- ============================================================
-- 4. GET NDC INDEX FOR CLIENT CACHING
-- ============================================================

CREATE OR REPLACE FUNCTION get_ndc_pricing_index(
  p_limit INTEGER DEFAULT 10000,
  p_offset INTEGER DEFAULT 0,
  p_updated_after TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_results JSONB;
  v_total INTEGER;
BEGIN
  SELECT COUNT(DISTINCT ndc_normalized)::INTEGER INTO v_total
  FROM ndc_pricing_index
  WHERE p_updated_after IS NULL OR updated_at > p_updated_after;

  WITH unique_ndcs AS (
    SELECT DISTINCT ON (ndc_normalized)
      ndc_original,
      ndc_normalized,
      product_name
    FROM ndc_pricing_index
    WHERE p_updated_after IS NULL OR updated_at > p_updated_after
    ORDER BY ndc_normalized, report_date DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  ),
  aggregated AS (
    SELECT 
      u.ndc_original,
      u.ndc_normalized,
      u.product_name,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', d.distributor_id,
            'name', d.distributor_name,
            'fullPrice', COALESCE(
              (SELECT price_per_unit FROM ndc_pricing_index 
               WHERE ndc_normalized = u.ndc_normalized 
                 AND distributor_id = d.distributor_id 
                 AND full_count > 0 AND partial_count = 0
               ORDER BY report_date DESC NULLS LAST LIMIT 1), 0
            ),
            'partialPrice', COALESCE(
              (SELECT price_per_unit FROM ndc_pricing_index 
               WHERE ndc_normalized = u.ndc_normalized 
                 AND distributor_id = d.distributor_id 
                 AND partial_count > 0 AND full_count = 0
               ORDER BY report_date DESC NULLS LAST LIMIT 1), 0
            )
          ) ORDER BY d.price_per_unit DESC NULLS LAST
        )
        FROM (
          SELECT DISTINCT ON (distributor_id) *
          FROM ndc_pricing_index
          WHERE ndc_normalized = u.ndc_normalized
          ORDER BY distributor_id, report_date DESC NULLS LAST
        ) d
      ) AS distributors,
      (SELECT MAX(price_per_unit) FROM ndc_pricing_index 
       WHERE ndc_normalized = u.ndc_normalized AND full_count > 0 AND partial_count = 0) AS best_full_price,
      (SELECT MAX(price_per_unit) FROM ndc_pricing_index 
       WHERE ndc_normalized = u.ndc_normalized AND partial_count > 0 AND full_count = 0) AS best_partial_price,
      (SELECT MAX(updated_at) FROM ndc_pricing_index WHERE ndc_normalized = u.ndc_normalized) AS last_updated
    FROM unique_ndcs u
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc', a.ndc_original,
      'ndcNormalized', a.ndc_normalized,
      'productName', a.product_name,
      'distributors', COALESCE(a.distributors, '[]'::jsonb),
      'bestFullPrice', COALESCE(a.best_full_price, 0),
      'bestPartialPrice', COALESCE(a.best_partial_price, 0),
      'lastUpdated', a.last_updated
    )
  ), '[]'::jsonb) INTO v_results
  FROM aggregated a;

  RETURN jsonb_build_object(
    'data', v_results,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- ============================================================
-- 5. TRIGGER - Matches optimization service extraction logic
-- ============================================================

CREATE OR REPLACE FUNCTION update_ndc_pricing_index_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ndc_original TEXT;
  v_ndc_normalized TEXT;
  v_product_name TEXT;
  v_credit_amount DECIMAL;
  v_quantity INTEGER;
  v_price_per_unit DECIMAL;
  v_full_count INTEGER;
  v_partial_count INTEGER;
  v_distributor_id UUID;
  v_distributor_name TEXT;
  v_distributor_email TEXT;
  v_distributor_phone TEXT;
  v_distributor_location TEXT;
  v_report_date DATE;
BEGIN
  -- Extract NDC (same as optimization service: item.ndcCode || item.ndc)
  v_ndc_original := COALESCE(
    NEW.data->>'ndcCode', 
    NEW.data->>'ndc'
  );
  
  -- Skip if no NDC
  IF v_ndc_original IS NULL OR TRIM(v_ndc_original) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Normalize NDC
  v_ndc_normalized := LOWER(REPLACE(TRIM(v_ndc_original), '-', ''));
  
  -- Extract product name (same priority as optimization service)
  -- itemName > productName > product_name > product > description > drugName > name
  v_product_name := COALESCE(
    NULLIF(TRIM(NEW.data->>'itemName'), ''),
    NULLIF(TRIM(NEW.data->>'productName'), ''),
    NULLIF(TRIM(NEW.data->>'product_name'), ''),
    NULLIF(TRIM(NEW.data->>'product'), ''),
    NULLIF(TRIM(NEW.data->>'description'), ''),
    NULLIF(TRIM(NEW.data->>'drugName'), ''),
    NULLIF(TRIM(NEW.data->>'name'), '')
  );
  
  -- Extract quantity and creditAmount (same as optimization service)
  v_quantity := COALESCE((NEW.data->>'quantity')::INTEGER, 1);
  v_credit_amount := COALESCE((NEW.data->>'creditAmount')::DECIMAL, 0);
  
  -- Calculate price per unit (same formula as optimization service)
  -- pricePerUnit = item.pricePerUnit || (creditAmount / quantity)
  v_price_per_unit := COALESCE(
    (NEW.data->>'pricePerUnit')::DECIMAL,
    CASE WHEN v_quantity > 0 AND v_credit_amount > 0 
         THEN v_credit_amount / v_quantity 
         ELSE 0 
    END
  );
  
  -- Extract full and partial counts (same as optimization service)
  v_full_count := COALESCE((NEW.data->>'full')::INTEGER, 0);
  v_partial_count := COALESCE((NEW.data->>'partial')::INTEGER, 0);
  
  -- Skip if no valid price
  IF v_price_per_unit <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get distributor info
  SELECT 
    ud.reverse_distributor_id,
    rd.name,
    rd.contact_email,
    rd.contact_phone,
    safe_get_location(rd.address),
    ud.report_date
  INTO 
    v_distributor_id, 
    v_distributor_name,
    v_distributor_email,
    v_distributor_phone,
    v_distributor_location,
    v_report_date
  FROM uploaded_documents ud
  LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
  WHERE ud.id = NEW.document_id;
  
  -- Skip if no distributor
  IF v_distributor_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Upsert into pricing index
  INSERT INTO ndc_pricing_index (
    ndc_original,
    ndc_normalized,
    product_name,
    distributor_id,
    distributor_name,
    distributor_email,
    distributor_phone,
    distributor_location,
    price_per_unit,
    credit_amount,
    quantity,
    full_count,
    partial_count,
    source_report_id,
    report_date,
    updated_at
  )
  VALUES (
    v_ndc_original,
    v_ndc_normalized,
    v_product_name,
    v_distributor_id,
    v_distributor_name,
    v_distributor_email,
    v_distributor_phone,
    v_distributor_location,
    v_price_per_unit,
    v_credit_amount,
    v_quantity,
    v_full_count,
    v_partial_count,
    NEW.id,
    v_report_date,
    NOW()
  )
  ON CONFLICT (ndc_normalized, distributor_id, full_count, partial_count)
  DO UPDATE SET
    ndc_original = EXCLUDED.ndc_original,
    product_name = COALESCE(EXCLUDED.product_name, ndc_pricing_index.product_name),
    distributor_name = COALESCE(EXCLUDED.distributor_name, ndc_pricing_index.distributor_name),
    distributor_email = COALESCE(EXCLUDED.distributor_email, ndc_pricing_index.distributor_email),
    distributor_phone = COALESCE(EXCLUDED.distributor_phone, ndc_pricing_index.distributor_phone),
    distributor_location = COALESCE(EXCLUDED.distributor_location, ndc_pricing_index.distributor_location),
    -- Only update price if new report is more recent
    price_per_unit = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
      THEN EXCLUDED.price_per_unit 
      ELSE ndc_pricing_index.price_per_unit 
    END,
    credit_amount = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
      THEN EXCLUDED.credit_amount 
      ELSE ndc_pricing_index.credit_amount 
    END,
    quantity = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
      THEN EXCLUDED.quantity 
      ELSE ndc_pricing_index.quantity 
    END,
    report_date = GREATEST(COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE), EXCLUDED.report_date),
    source_report_id = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
      THEN EXCLUDED.source_report_id 
      ELSE ndc_pricing_index.source_report_id 
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_ndc_pricing_index ON return_reports;
CREATE TRIGGER trg_update_ndc_pricing_index
  AFTER INSERT ON return_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_ndc_pricing_index_trigger();

-- ============================================================
-- 6. POPULATE FROM EXISTING DATA (Matching optimization service logic)
-- ============================================================

-- Clear existing
TRUNCATE TABLE ndc_pricing_index;

-- Insert with same extraction logic as optimization service
INSERT INTO ndc_pricing_index (
  ndc_original,
  ndc_normalized,
  product_name,
  distributor_id,
  distributor_name,
  distributor_email,
  distributor_phone,
  distributor_location,
  price_per_unit,
  credit_amount,
  quantity,
  full_count,
  partial_count,
  source_report_id,
  report_date,
  updated_at
)
SELECT DISTINCT ON (
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')),
  ud.reverse_distributor_id,
  COALESCE((rr.data->>'full')::INTEGER, 0),
  COALESCE((rr.data->>'partial')::INTEGER, 0)
)
  -- NDC (same as optimization service)
  COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_original,
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) AS ndc_normalized,
  
  -- Product name (same priority as optimization service)
  COALESCE(
    NULLIF(TRIM(rr.data->>'itemName'), ''),
    NULLIF(TRIM(rr.data->>'productName'), ''),
    NULLIF(TRIM(rr.data->>'product_name'), ''),
    NULLIF(TRIM(rr.data->>'product'), ''),
    NULLIF(TRIM(rr.data->>'description'), ''),
    NULLIF(TRIM(rr.data->>'drugName'), ''),
    NULLIF(TRIM(rr.data->>'name'), '')
  ) AS product_name,
  
  -- Distributor info
  ud.reverse_distributor_id AS distributor_id,
  rd.name AS distributor_name,
  rd.contact_email AS distributor_email,
  rd.contact_phone AS distributor_phone,
  safe_get_location(rd.address) AS distributor_location,
  
  -- Price calculation (same as optimization service: creditAmount / quantity)
  COALESCE(
    (rr.data->>'pricePerUnit')::DECIMAL,
    CASE 
      WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
        AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
      THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
      ELSE 0 
    END
  ) AS price_per_unit,
  COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) AS credit_amount,
  COALESCE((rr.data->>'quantity')::INTEGER, 1) AS quantity,
  
  -- Full/Partial counts (for unit type filtering)
  COALESCE((rr.data->>'full')::INTEGER, 0) AS full_count,
  COALESCE((rr.data->>'partial')::INTEGER, 0) AS partial_count,
  
  -- Metadata
  rr.id AS source_report_id,
  ud.report_date,
  NOW() AS updated_at
  
FROM return_reports rr
JOIN uploaded_documents ud ON rr.document_id = ud.id
LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
WHERE 
  COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') IS NOT NULL
  AND TRIM(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', '')) != ''
  AND ud.reverse_distributor_id IS NOT NULL
  -- Only include records with valid price
  AND (
    (rr.data->>'pricePerUnit')::DECIMAL > 0
    OR (
      COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
      AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
    )
  )
ORDER BY 
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')),
  ud.reverse_distributor_id,
  COALESCE((rr.data->>'full')::INTEGER, 0),
  COALESCE((rr.data->>'partial')::INTEGER, 0),
  ud.report_date DESC NULLS LAST;

-- ============================================================
-- 7. VERIFY DATA
-- ============================================================

SELECT 
  'Total records' AS metric,
  COUNT(*)::TEXT AS value
FROM ndc_pricing_index
UNION ALL
SELECT 
  'Unique NDCs',
  COUNT(DISTINCT ndc_normalized)::TEXT
FROM ndc_pricing_index
UNION ALL
SELECT 
  'Unique Distributors',
  COUNT(DISTINCT distributor_id)::TEXT
FROM ndc_pricing_index
UNION ALL
SELECT 
  'Records with product name',
  COUNT(*)::TEXT
FROM ndc_pricing_index
WHERE product_name IS NOT NULL AND product_name != ''
UNION ALL
SELECT
  'Full price records (full > 0, partial = 0)',
  COUNT(*)::TEXT
FROM ndc_pricing_index
WHERE full_count > 0 AND partial_count = 0
UNION ALL
SELECT
  'Partial price records (partial > 0, full = 0)',
  COUNT(*)::TEXT
FROM ndc_pricing_index
WHERE partial_count > 0 AND full_count = 0;

-- Sample data check
SELECT 
  ndc_original,
  product_name,
  distributor_name,
  price_per_unit,
  full_count,
  partial_count,
  report_date
FROM ndc_pricing_index
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON ndc_pricing_index TO authenticated;
GRANT EXECUTE ON FUNCTION search_ndc_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION get_ndc_pricing_index TO authenticated;
