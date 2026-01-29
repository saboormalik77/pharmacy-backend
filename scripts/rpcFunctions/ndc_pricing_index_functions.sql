-- ============================================================
-- NDC PRICING INDEX - Fast Search Solution
-- This creates a pre-computed table for instant NDC searches
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. CREATE NDC PRICING INDEX TABLE
-- ============================================================

DROP TABLE IF EXISTS ndc_pricing_index CASCADE;

CREATE TABLE ndc_pricing_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- NDC Information
  ndc_original VARCHAR(50) NOT NULL,
  ndc_normalized VARCHAR(20) NOT NULL,
  product_name TEXT,
  
  -- Distributor Information  
  distributor_id UUID REFERENCES reverse_distributors(id) ON DELETE CASCADE,
  distributor_name VARCHAR(255),
  distributor_email VARCHAR(255),
  distributor_phone VARCHAR(50),
  distributor_location TEXT,
  
  -- Pricing (latest)
  full_price DECIMAL(12,4),
  partial_price DECIMAL(12,4),
  credit_amount DECIMAL(12,4),
  full_quantity INTEGER,
  partial_quantity INTEGER,
  
  -- Metadata
  source_report_id UUID REFERENCES return_reports(id) ON DELETE SET NULL,
  report_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one record per NDC-distributor combination
  UNIQUE(ndc_normalized, distributor_id)
);

-- ============================================================
-- 2. CREATE INDEXES FOR BLAZING FAST SEARCHES
-- ============================================================

-- Primary search indexes
CREATE INDEX idx_ndc_pricing_ndc_normalized ON ndc_pricing_index(ndc_normalized);
CREATE INDEX idx_ndc_pricing_ndc_original ON ndc_pricing_index(ndc_original);

-- Trigram indexes for partial/fuzzy matching (LIKE '%search%')
CREATE INDEX idx_ndc_pricing_ndc_trgm ON ndc_pricing_index USING gin(ndc_normalized gin_trgm_ops);
CREATE INDEX idx_ndc_pricing_ndc_orig_trgm ON ndc_pricing_index USING gin(ndc_original gin_trgm_ops);
CREATE INDEX idx_ndc_pricing_product_trgm ON ndc_pricing_index USING gin(product_name gin_trgm_ops);

-- Composite indexes for common queries
CREATE INDEX idx_ndc_pricing_ndc_distributor ON ndc_pricing_index(ndc_normalized, distributor_id);
CREATE INDEX idx_ndc_pricing_updated ON ndc_pricing_index(updated_at DESC);
CREATE INDEX idx_ndc_pricing_distributor ON ndc_pricing_index(distributor_id);

-- ============================================================
-- 3. FAST SEARCH RPC FUNCTION
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

  -- Normalize search term (remove dashes, lowercase)
  v_search_normalized := LOWER(REPLACE(TRIM(p_search), '-', ''));
  
  -- Search and aggregate results by NDC
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
      -- Prefer exact matches
      CASE 
        WHEN p.ndc_normalized = v_search_normalized THEN 0
        WHEN p.ndc_normalized LIKE v_search_normalized || '%' THEN 1
        ELSE 2
      END,
      p.updated_at DESC
    LIMIT p_limit
  ),
  results_with_distributors AS (
    SELECT 
      m.ndc_original,
      m.ndc_normalized,
      m.product_name,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', d.distributor_id,
            'name', d.distributor_name,
            'fullPrice', COALESCE(d.full_price, 0),
            'partialPrice', COALESCE(d.partial_price, 0),
            'email', d.distributor_email,
            'phone', d.distributor_phone,
            'location', d.distributor_location,
            'reportDate', d.report_date
          ) ORDER BY COALESCE(d.full_price, 0) DESC NULLS LAST
        )
        FROM ndc_pricing_index d
        WHERE d.ndc_normalized = m.ndc_normalized
      ) AS distributors,
      (
        SELECT MAX(full_price) 
        FROM ndc_pricing_index 
        WHERE ndc_normalized = m.ndc_normalized AND full_price > 0
      ) AS best_full_price,
      (
        SELECT MAX(partial_price) 
        FROM ndc_pricing_index 
        WHERE ndc_normalized = m.ndc_normalized AND partial_price > 0
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
        'bestPartialPrice', COALESCE(r.best_partial_price, 0)
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
-- 4. GET FULL NDC INDEX FOR CLIENT CACHING
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
  -- Get total count
  SELECT COUNT(DISTINCT ndc_normalized)::INTEGER INTO v_total
  FROM ndc_pricing_index
  WHERE p_updated_after IS NULL OR updated_at > p_updated_after;

  -- Get aggregated results
  WITH unique_ndcs AS (
    SELECT DISTINCT ON (ndc_normalized)
      ndc_original,
      ndc_normalized,
      product_name
    FROM ndc_pricing_index
    WHERE p_updated_after IS NULL OR updated_at > p_updated_after
    ORDER BY ndc_normalized, updated_at DESC
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
            'fullPrice', COALESCE(d.full_price, 0),
            'partialPrice', COALESCE(d.partial_price, 0)
          ) ORDER BY COALESCE(d.full_price, 0) DESC
        )
        FROM ndc_pricing_index d
        WHERE d.ndc_normalized = u.ndc_normalized
      ) AS distributors,
      (SELECT MAX(full_price) FROM ndc_pricing_index WHERE ndc_normalized = u.ndc_normalized) AS best_full_price,
      (SELECT MAX(partial_price) FROM ndc_pricing_index WHERE ndc_normalized = u.ndc_normalized) AS best_partial_price,
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
-- 5. TRIGGER FUNCTION TO AUTO-UPDATE PRICING INDEX
-- ============================================================

CREATE OR REPLACE FUNCTION update_ndc_pricing_index_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ndc_original TEXT;
  v_ndc_normalized TEXT;
  v_product_name TEXT;
  v_full_price DECIMAL;
  v_partial_price DECIMAL;
  v_credit_amount DECIMAL;
  v_full_qty INTEGER;
  v_partial_qty INTEGER;
  v_distributor_id UUID;
  v_distributor_name TEXT;
  v_distributor_email TEXT;
  v_distributor_phone TEXT;
  v_distributor_location TEXT;
  v_report_date DATE;
BEGIN
  -- Extract NDC from JSONB data
  v_ndc_original := COALESCE(
    NEW.data->>'ndcCode', 
    NEW.data->>'ndc',
    NEW.data->>'NDC'
  );
  
  -- Skip if no NDC found
  IF v_ndc_original IS NULL OR TRIM(v_ndc_original) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Normalize NDC (remove dashes)
  v_ndc_normalized := LOWER(REPLACE(TRIM(v_ndc_original), '-', ''));
  
  -- Extract product name
  v_product_name := COALESCE(
    NEW.data->>'productDescription',
    NEW.data->>'description',
    NEW.data->>'productName',
    NEW.data->>'product_name'
  );
  
  -- Extract quantities
  v_full_qty := COALESCE((NEW.data->>'full')::INTEGER, 0);
  v_partial_qty := COALESCE((NEW.data->>'partial')::INTEGER, 0);
  
  -- Extract credit amount
  v_credit_amount := COALESCE(
    (NEW.data->>'creditAmount')::DECIMAL,
    (NEW.data->>'credit_amount')::DECIMAL,
    (NEW.data->>'totalCredit')::DECIMAL,
    0
  );
  
  -- Calculate prices per unit
  v_full_price := CASE 
    WHEN v_full_qty > 0 AND v_credit_amount > 0
    THEN v_credit_amount / v_full_qty 
    ELSE NULL 
  END;
  
  v_partial_price := CASE 
    WHEN v_partial_qty > 0 AND v_credit_amount > 0
    THEN v_credit_amount / v_partial_qty 
    ELSE NULL 
  END;
  
  -- Get distributor info from uploaded_documents
  SELECT 
    ud.reverse_distributor_id,
    rd.name,
    rd.contact_email,
    rd.contact_phone,
    rd.address->>'city' || ', ' || rd.address->>'state',
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
    full_price,
    partial_price,
    credit_amount,
    full_quantity,
    partial_quantity,
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
    v_full_price,
    v_partial_price,
    v_credit_amount,
    v_full_qty,
    v_partial_qty,
    NEW.id,
    v_report_date,
    NOW()
  )
  ON CONFLICT (ndc_normalized, distributor_id)
  DO UPDATE SET
    ndc_original = EXCLUDED.ndc_original,
    product_name = COALESCE(EXCLUDED.product_name, ndc_pricing_index.product_name),
    distributor_name = COALESCE(EXCLUDED.distributor_name, ndc_pricing_index.distributor_name),
    distributor_email = COALESCE(EXCLUDED.distributor_email, ndc_pricing_index.distributor_email),
    distributor_phone = COALESCE(EXCLUDED.distributor_phone, ndc_pricing_index.distributor_phone),
    distributor_location = COALESCE(EXCLUDED.distributor_location, ndc_pricing_index.distributor_location),
    -- Only update prices if new report is more recent
    full_price = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
        AND EXCLUDED.full_price IS NOT NULL
      THEN EXCLUDED.full_price 
      ELSE ndc_pricing_index.full_price 
    END,
    partial_price = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
        AND EXCLUDED.partial_price IS NOT NULL
      THEN EXCLUDED.partial_price 
      ELSE ndc_pricing_index.partial_price 
    END,
    credit_amount = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
      THEN EXCLUDED.credit_amount 
      ELSE ndc_pricing_index.credit_amount 
    END,
    full_quantity = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
      THEN EXCLUDED.full_quantity 
      ELSE ndc_pricing_index.full_quantity 
    END,
    partial_quantity = CASE 
      WHEN EXCLUDED.report_date >= COALESCE(ndc_pricing_index.report_date, '1900-01-01'::DATE)
      THEN EXCLUDED.partial_quantity 
      ELSE ndc_pricing_index.partial_quantity 
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

-- ============================================================
-- 6. CREATE TRIGGER ON return_reports
-- ============================================================

DROP TRIGGER IF EXISTS trg_update_ndc_pricing_index ON return_reports;

CREATE TRIGGER trg_update_ndc_pricing_index
  AFTER INSERT ON return_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_ndc_pricing_index_trigger();

-- ============================================================
-- 7. POPULATE INDEX FROM EXISTING DATA
-- ============================================================

-- Clear existing data first
TRUNCATE TABLE ndc_pricing_index;

-- Insert from existing return_reports
INSERT INTO ndc_pricing_index (
  ndc_original,
  ndc_normalized,
  product_name,
  distributor_id,
  distributor_name,
  distributor_email,
  distributor_phone,
  distributor_location,
  full_price,
  partial_price,
  credit_amount,
  full_quantity,
  partial_quantity,
  source_report_id,
  report_date,
  updated_at
)
SELECT DISTINCT ON (
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', rr.data->>'NDC', ''), '-', '')),
  ud.reverse_distributor_id
)
  COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', rr.data->>'NDC') AS ndc_original,
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', rr.data->>'NDC', ''), '-', '')) AS ndc_normalized,
  COALESCE(rr.data->>'productDescription', rr.data->>'description', rr.data->>'productName') AS product_name,
  ud.reverse_distributor_id AS distributor_id,
  rd.name AS distributor_name,
  rd.contact_email AS distributor_email,
  rd.contact_phone AS distributor_phone,
  COALESCE(rd.address->>'city', '') || ', ' || COALESCE(rd.address->>'state', '') AS distributor_location,
  CASE 
    WHEN COALESCE((rr.data->>'full')::INTEGER, 0) > 0 
    THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / (rr.data->>'full')::INTEGER 
    ELSE NULL 
  END AS full_price,
  CASE 
    WHEN COALESCE((rr.data->>'partial')::INTEGER, 0) > 0 
    THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / (rr.data->>'partial')::INTEGER 
    ELSE NULL 
  END AS partial_price,
  COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) AS credit_amount,
  COALESCE((rr.data->>'full')::INTEGER, 0) AS full_quantity,
  COALESCE((rr.data->>'partial')::INTEGER, 0) AS partial_quantity,
  rr.id AS source_report_id,
  ud.report_date,
  NOW() AS updated_at
FROM return_reports rr
JOIN uploaded_documents ud ON rr.document_id = ud.id
LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
WHERE 
  COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', rr.data->>'NDC') IS NOT NULL
  AND TRIM(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', rr.data->>'NDC', '')) != ''
  AND ud.reverse_distributor_id IS NOT NULL
ORDER BY 
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', rr.data->>'NDC', ''), '-', '')),
  ud.reverse_distributor_id,
  ud.report_date DESC NULLS LAST;

-- ============================================================
-- 8. VERIFY DATA
-- ============================================================

-- Check how many records were created
SELECT 
  'Total NDC records' AS metric,
  COUNT(*) AS value
FROM ndc_pricing_index
UNION ALL
SELECT 
  'Unique NDCs',
  COUNT(DISTINCT ndc_normalized)
FROM ndc_pricing_index
UNION ALL
SELECT 
  'Unique Distributors',
  COUNT(DISTINCT distributor_id)
FROM ndc_pricing_index;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON ndc_pricing_index TO authenticated;
GRANT EXECUTE ON FUNCTION search_ndc_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION get_ndc_pricing_index TO authenticated;

