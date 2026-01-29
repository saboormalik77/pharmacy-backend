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
  -- IMPORTANT: Group by distributor_name (string), NOT distributor_id (UUID)
  -- This matches optimization API which uses distributorName as the grouping key
  distributor_id UUID,                       -- Reference only, not for grouping
  distributor_name VARCHAR(255) NOT NULL,    -- PRIMARY KEY for grouping (same as optimization API)
  distributor_email VARCHAR(255),
  distributor_phone VARCHAR(50),
  distributor_location TEXT,
  
  -- Pricing - matches optimization service calculation
  -- price_per_unit = creditAmount / quantity (when quantity > 0)
  price_per_unit DECIMAL(12,4),
  credit_amount DECIMAL(12,4),
  quantity INTEGER,
  
  -- CRITICAL FIX: Use BOOLEAN flags instead of actual counts!
  -- Optimization API only cares IF (full > 0 && partial === 0), not the actual value
  -- This ensures we store ONE "full price" per distributor-NDC, not multiple
  is_full_record BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE if (full > 0 AND partial = 0)
  is_partial_record BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE if (partial > 0 AND full = 0)
  
  -- Metadata
  source_report_id UUID REFERENCES return_reports(id) ON DELETE SET NULL,
  -- Date fields for ordering (SAME fallback chain as optimization API lines 340-352):
  -- Priority: report_date > uploaded_at > source_created_at
  report_date DATE,                          -- uploaded_documents.report_date
  uploaded_at TIMESTAMP WITH TIME ZONE,      -- uploaded_documents.uploaded_at
  source_created_at TIMESTAMP WITH TIME ZONE, -- return_reports.created_at (ORIGINAL, for fallback)
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CRITICAL FIX: Use BOOLEAN flags for uniqueness
  -- This ensures ONE full price and ONE partial price per distributor-NDC
  -- Matching how optimization API stores prices in distributorNdcToFullPriceMap/distributorNdcToPartialPriceMap
  UNIQUE(ndc_normalized, distributor_name, is_full_record, is_partial_record)
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
CREATE INDEX idx_ndc_pricing_distributor_name ON ndc_pricing_index(distributor_name);
CREATE INDEX idx_ndc_pricing_updated ON ndc_pricing_index(updated_at DESC);
CREATE INDEX idx_ndc_pricing_report_date ON ndc_pricing_index(report_date DESC);
-- Composite index for the UNIQUE constraint and common queries
CREATE INDEX idx_ndc_pricing_ndc_dist_name ON ndc_pricing_index(ndc_normalized, distributor_name);

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
        -- CRITICAL: Group by distributor_name (NOT distributor_id) - same as optimization API
        SELECT jsonb_agg(dist_data ORDER BY (dist_data->>'fullPrice')::numeric DESC NULLS LAST)
        FROM (
          SELECT DISTINCT ON (d.distributor_name)
            jsonb_build_object(
              'id', d.distributor_id,
              'name', d.distributor_name,
              -- fullPrice: Price from the LATEST FULL record (is_full_record = TRUE)
              -- CRITICAL FIX: Add ORDER BY to get LATEST price (same as optimization API)
              -- Optimization API sorts by date DESC, then by id ASC for tiebreaker
              'fullPrice', COALESCE(
                (SELECT price_per_unit FROM ndc_pricing_index 
                 WHERE ndc_normalized = m.ndc_normalized 
                   AND distributor_name = d.distributor_name 
                   AND is_full_record = TRUE
                 ORDER BY COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                          source_report_id ASC
                 LIMIT 1), 0
              ),
              -- partialPrice: Price from the LATEST PARTIAL record (is_partial_record = TRUE)
              -- CRITICAL FIX: Add ORDER BY to get LATEST price (same as optimization API)
              'partialPrice', COALESCE(
                (SELECT price_per_unit FROM ndc_pricing_index 
                 WHERE ndc_normalized = m.ndc_normalized 
                   AND distributor_name = d.distributor_name 
                   AND is_partial_record = TRUE
                 ORDER BY COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                          source_report_id ASC
                 LIMIT 1), 0
              ),
              'email', d.distributor_email,
              'phone', d.distributor_phone,
              'location', d.distributor_location,
              'reportDate', COALESCE(d.report_date::timestamp, d.uploaded_at, d.source_created_at)
            ) AS dist_data
          FROM ndc_pricing_index d
          WHERE d.ndc_normalized = m.ndc_normalized
          ORDER BY d.distributor_name, COALESCE(d.report_date::timestamp, d.uploaded_at, d.source_created_at) DESC NULLS LAST
        ) sub
      ) AS distributors,
      -- Best full price (highest among all distributors) - use LATEST price per distributor
      -- CRITICAL FIX: Get max of LATEST prices, not max of ALL prices
      (
        SELECT MAX(latest_price) FROM (
          SELECT DISTINCT ON (distributor_name) price_per_unit AS latest_price
          FROM ndc_pricing_index 
          WHERE ndc_normalized = m.ndc_normalized 
            AND is_full_record = TRUE
            AND price_per_unit > 0
          ORDER BY distributor_name, 
                   COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                   source_report_id ASC
        ) sub
      ) AS best_full_price,
      -- Best partial price (highest among all distributors) - use LATEST price per distributor
      -- CRITICAL FIX: Get max of LATEST prices, not max of ALL prices
      (
        SELECT MAX(latest_price) FROM (
          SELECT DISTINCT ON (distributor_name) price_per_unit AS latest_price
          FROM ndc_pricing_index 
          WHERE ndc_normalized = m.ndc_normalized 
            AND is_partial_record = TRUE
            AND price_per_unit > 0
          ORDER BY distributor_name, 
                   COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                   source_report_id ASC
        ) sub
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

  -- IMPORTANT: Use COALESCE(report_date, uploaded_at, created_at) for ordering
  -- This matches the optimization API's fallback chain for determining "latest" prices
  WITH unique_ndcs AS (
    SELECT DISTINCT ON (ndc_normalized)
      ndc_original,
      ndc_normalized,
      product_name
    FROM ndc_pricing_index
    WHERE p_updated_after IS NULL OR updated_at > p_updated_after
    ORDER BY ndc_normalized, COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  ),
  aggregated AS (
    SELECT 
      u.ndc_original,
      u.ndc_normalized,
      u.product_name,
      (
        -- CRITICAL: Group by distributor_name (NOT distributor_id) - same as optimization API
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', d.distributor_id,
            'name', d.distributor_name,
            'email', d.distributor_email,
            'phone', d.distributor_phone,
            'location', d.distributor_location,
            -- CRITICAL FIX: Add ORDER BY to get LATEST price (same as optimization API)
            'fullPrice', COALESCE(
              (SELECT price_per_unit FROM ndc_pricing_index 
               WHERE ndc_normalized = u.ndc_normalized 
                 AND distributor_name = d.distributor_name 
                 AND is_full_record = TRUE
               ORDER BY COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                        source_report_id ASC
               LIMIT 1), 0
            ),
            -- CRITICAL FIX: Add ORDER BY to get LATEST price (same as optimization API)
            'partialPrice', COALESCE(
              (SELECT price_per_unit FROM ndc_pricing_index 
               WHERE ndc_normalized = u.ndc_normalized 
                 AND distributor_name = d.distributor_name 
                 AND is_partial_record = TRUE
               ORDER BY COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                        source_report_id ASC
               LIMIT 1), 0
            )
          ) ORDER BY d.price_per_unit DESC NULLS LAST
        )
        FROM (
          SELECT DISTINCT ON (distributor_name) *
          FROM ndc_pricing_index
          WHERE ndc_normalized = u.ndc_normalized
          ORDER BY distributor_name, COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST
        ) d
      ) AS distributors,
      -- CRITICAL FIX: Get max of LATEST prices per distributor, not max of ALL prices
      (SELECT MAX(latest_price) FROM (
        SELECT DISTINCT ON (distributor_name) price_per_unit AS latest_price
        FROM ndc_pricing_index 
        WHERE ndc_normalized = u.ndc_normalized AND is_full_record = TRUE
        ORDER BY distributor_name, 
                 COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                 source_report_id ASC
      ) sub) AS best_full_price,
      -- CRITICAL FIX: Get max of LATEST prices per distributor, not max of ALL prices
      (SELECT MAX(latest_price) FROM (
        SELECT DISTINCT ON (distributor_name) price_per_unit AS latest_price
        FROM ndc_pricing_index 
        WHERE ndc_normalized = u.ndc_normalized AND is_partial_record = TRUE
        ORDER BY distributor_name, 
                 COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                 source_report_id ASC
      ) sub) AS best_partial_price,
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
  v_is_full_record BOOLEAN;     -- TRUE if (full > 0 AND partial = 0)
  v_is_partial_record BOOLEAN;  -- TRUE if (partial > 0 AND full = 0)
  v_distributor_id UUID;
  v_distributor_name TEXT;
  v_distributor_email TEXT;
  v_distributor_phone TEXT;
  v_distributor_location TEXT;
  v_report_date DATE;
  v_uploaded_at TIMESTAMP WITH TIME ZONE;      -- uploaded_documents.uploaded_at
  v_source_created_at TIMESTAMP WITH TIME ZONE; -- return_reports.created_at (ORIGINAL - for fallback)
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
  
  -- CRITICAL: Calculate boolean flags (same logic as optimization API lines 750-751)
  -- is_full_record = (full > 0 && partial === 0)
  -- is_partial_record = (partial > 0 && full === 0)
  v_is_full_record := (v_full_count > 0 AND v_partial_count = 0);
  v_is_partial_record := (v_partial_count > 0 AND v_full_count = 0);
  
  -- Store original return_reports.created_at for fallback ordering
  -- This matches optimization API line 343: a.created_at (return_reports.created_at)
  v_source_created_at := NEW.created_at;
  
  -- Skip if no valid price
  IF v_price_per_unit <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get distributor info (including uploaded_at for fallback ordering)
  -- CRITICAL: Use same fallback chain for distributor name as optimization API (lines 455-458):
  --   1. reverse_distributors.name
  --   2. return_reports.data->>'reverseDistributor'
  --   3. return_reports.data->'reverseDistributorInfo'->>'name'
  --   4. 'Unknown Distributor'
  SELECT 
    ud.reverse_distributor_id,
    TRIM(COALESCE(
      rd.name,
      NEW.data->>'reverseDistributor',
      NEW.data->'reverseDistributorInfo'->>'name',
      'Unknown Distributor'
    )),
    rd.contact_email,
    rd.contact_phone,
    safe_get_location(rd.address),
    ud.report_date,
    ud.uploaded_at
  INTO 
    v_distributor_id, 
    v_distributor_name,
    v_distributor_email,
    v_distributor_phone,
    v_distributor_location,
    v_report_date,
    v_uploaded_at
  FROM uploaded_documents ud
  LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
  WHERE ud.id = NEW.document_id;
  
  -- Skip if no valid distributor name
  IF v_distributor_name IS NULL OR v_distributor_name = 'Unknown Distributor' THEN
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
    is_full_record,
    is_partial_record,
    source_report_id,
    report_date,
    uploaded_at,
    source_created_at,
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
    v_is_full_record,
    v_is_partial_record,
    NEW.id,
    v_report_date,
    v_uploaded_at,
    v_source_created_at,
    NOW()
  )
  ON CONFLICT (ndc_normalized, distributor_name, is_full_record, is_partial_record)
  DO UPDATE SET
    ndc_original = EXCLUDED.ndc_original,
    product_name = COALESCE(EXCLUDED.product_name, ndc_pricing_index.product_name),
    distributor_id = COALESCE(EXCLUDED.distributor_id, ndc_pricing_index.distributor_id),
    distributor_email = COALESCE(EXCLUDED.distributor_email, ndc_pricing_index.distributor_email),
    distributor_phone = COALESCE(EXCLUDED.distributor_phone, ndc_pricing_index.distributor_phone),
    distributor_location = COALESCE(EXCLUDED.distributor_location, ndc_pricing_index.distributor_location),
    -- Only update price if new report is more recent
    -- SAME fallback chain as optimization API: report_date || uploaded_at || created_at
    price_per_unit = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.price_per_unit 
      ELSE ndc_pricing_index.price_per_unit 
    END,
    credit_amount = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.credit_amount 
      ELSE ndc_pricing_index.credit_amount 
    END,
    quantity = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.quantity 
      ELSE ndc_pricing_index.quantity 
    END,
    report_date = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.report_date 
      ELSE ndc_pricing_index.report_date 
    END,
    uploaded_at = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.uploaded_at 
      ELSE ndc_pricing_index.uploaded_at 
    END,
    source_created_at = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.source_created_at 
      ELSE ndc_pricing_index.source_created_at 
    END,
    source_report_id = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
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

-- Insert with EXACT same extraction logic as optimization service
-- CRITICAL: Use distributor_name (NOT distributor_id) for grouping - same as optimization API
-- The optimization API uses distributorName as the key, not UUID
-- Fallback chain for distributor name (lines 455-458 in optimizationService.ts):
--   1. reverse_distributors.name
--   2. return_reports.data->>'reverseDistributor'
--   3. return_reports.data->'reverseDistributorInfo'->>'name'
--   4. 'Unknown Distributor'
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
  is_full_record,
  is_partial_record,
  source_report_id,
  report_date,
  uploaded_at,
  source_created_at,
  updated_at
)
SELECT DISTINCT ON (
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')),
  -- CRITICAL: Group by distributor NAME (same as optimization API)
  TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )),
  -- CRITICAL FIX: Use BOOLEAN expression, not actual counts!
  -- is_full_record = (full > 0 AND partial = 0)
  (COALESCE((rr.data->>'full')::INTEGER, 0) > 0 AND COALESCE((rr.data->>'partial')::INTEGER, 0) = 0),
  -- is_partial_record = (partial > 0 AND full = 0)
  (COALESCE((rr.data->>'partial')::INTEGER, 0) > 0 AND COALESCE((rr.data->>'full')::INTEGER, 0) = 0)
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
  
  -- Distributor info (using SAME fallback chain as optimization API lines 455-458)
  ud.reverse_distributor_id AS distributor_id,
  TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )) AS distributor_name,
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
  
  -- CRITICAL FIX: Boolean flags (same logic as optimization API lines 750-751)
  -- is_full_record = (full > 0 AND partial = 0)
  (COALESCE((rr.data->>'full')::INTEGER, 0) > 0 AND COALESCE((rr.data->>'partial')::INTEGER, 0) = 0) AS is_full_record,
  -- is_partial_record = (partial > 0 AND full = 0)
  (COALESCE((rr.data->>'partial')::INTEGER, 0) > 0 AND COALESCE((rr.data->>'full')::INTEGER, 0) = 0) AS is_partial_record,
  
  -- Metadata (dates for fallback ordering - SAME as optimization API)
  rr.id AS source_report_id,
  ud.report_date,                -- uploaded_documents.report_date
  ud.uploaded_at,                -- uploaded_documents.uploaded_at
  rr.created_at AS source_created_at, -- return_reports.created_at (ORIGINAL - for fallback)
  NOW() AS updated_at
  
FROM return_reports rr
JOIN uploaded_documents ud ON rr.document_id = ud.id
LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
WHERE 
  COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') IS NOT NULL
  AND TRIM(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', '')) != ''
  -- Must have a valid distributor name (either from table or from data)
  AND (
    rd.name IS NOT NULL 
    OR rr.data->>'reverseDistributor' IS NOT NULL
    OR rr.data->'reverseDistributorInfo'->>'name' IS NOT NULL
  )
  -- Only include records with valid price
  AND (
    (rr.data->>'pricePerUnit')::DECIMAL > 0
    OR (
      COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
      AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
    )
  )
-- SAME ordering as optimization API: COALESCE(report_date, uploaded_at, created_at) DESC
-- CRITICAL: When dates are IDENTICAL, we need a TIEBREAKER!
-- The optimization API fetches records without ORDER BY, then sorts by date DESC.
-- JavaScript's stable sort preserves original order (by database id) for equal dates.
-- The first match (lowest id) gets stored via: if (!map[key]) { map[key] = value; }
-- So we use rr.id ASC as final tiebreaker to match this behavior.
ORDER BY 
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')),
  -- CRITICAL: Order by distributor NAME (same as DISTINCT ON)
  TRIM(COALESCE(
    rd.name,
    rr.data->>'reverseDistributor',
    rr.data->'reverseDistributorInfo'->>'name',
    'Unknown Distributor'
  )),
  -- CRITICAL FIX: Order by BOOLEAN expressions (same as DISTINCT ON)
  (COALESCE((rr.data->>'full')::INTEGER, 0) > 0 AND COALESCE((rr.data->>'partial')::INTEGER, 0) = 0),
  (COALESCE((rr.data->>'partial')::INTEGER, 0) > 0 AND COALESCE((rr.data->>'full')::INTEGER, 0) = 0),
  -- Then order by date DESC to get the LATEST record
  COALESCE(ud.report_date::timestamp, ud.uploaded_at, rr.created_at) DESC NULLS LAST,
  -- FINAL TIEBREAKER: When all dates are identical, use record ID ASC
  -- This matches optimization API's behavior: JS stable sort preserves DB order (by id),
  -- and the first match (lowest id) gets stored in the map.
  rr.id ASC;

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
  'Full price records (is_full_record = TRUE)',
  COUNT(*)::TEXT
FROM ndc_pricing_index
WHERE is_full_record = TRUE
UNION ALL
SELECT
  'Partial price records (is_partial_record = TRUE)',
  COUNT(*)::TEXT
FROM ndc_pricing_index
WHERE is_partial_record = TRUE;

-- Sample data check
SELECT 
  ndc_original,
  product_name,
  distributor_name,
  price_per_unit,
  is_full_record,
  is_partial_record,
  report_date
FROM ndc_pricing_index
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================
-- DEBUG: Compare raw return_reports data for a specific NDC
-- This shows ALL FULL records for RxReturn Services LLC to see why price differs
-- ============================================================

-- DEBUG 1: Show ALL raw FULL records for NDC 60219-1748-02 grouped by distributor
-- This shows EVERY record that exists, sorted by date DESC (latest first)
SELECT 
  TRIM(COALESCE(rd.name, rr.data->>'reverseDistributor', rr.data->'reverseDistributorInfo'->>'name')) AS distributor_name,
  COALESCE(
    (rr.data->>'pricePerUnit')::DECIMAL,
    CASE 
      WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
        AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
      THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
      ELSE 0 
    END
  ) AS price_per_unit,
  COALESCE((rr.data->>'full')::INTEGER, 0) AS full_count,
  COALESCE((rr.data->>'partial')::INTEGER, 0) AS partial_count,
  ud.report_date,
  ud.uploaded_at,
  rr.created_at AS source_created_at,
  -- Show the sort key used (same as optimization API)
  COALESCE(ud.report_date::timestamp, ud.uploaded_at, rr.created_at) AS sort_date
FROM return_reports rr
JOIN uploaded_documents ud ON rr.document_id = ud.id
LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
WHERE 
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) = '60219174802'
  -- Only FULL records (same condition as optimization API)
  AND COALESCE((rr.data->>'full')::INTEGER, 0) > 0 
  AND COALESCE((rr.data->>'partial')::INTEGER, 0) = 0
ORDER BY 
  TRIM(COALESCE(rd.name, rr.data->>'reverseDistributor', rr.data->'reverseDistributorInfo'->>'name')),
  -- CRITICAL: Order by the SAME expression used in DISTINCT ON
  COALESCE(ud.report_date::timestamp, ud.uploaded_at, rr.created_at) DESC NULLS LAST;

-- DEBUG 2: Show what the DISTINCT ON would pick (the FIRST/LATEST record per distributor)
-- This simulates what the INSERT statement does
SELECT DISTINCT ON (
  TRIM(COALESCE(rd.name, rr.data->>'reverseDistributor', rr.data->'reverseDistributorInfo'->>'name'))
)
  TRIM(COALESCE(rd.name, rr.data->>'reverseDistributor', rr.data->'reverseDistributorInfo'->>'name')) AS distributor_name,
  COALESCE(
    (rr.data->>'pricePerUnit')::DECIMAL,
    CASE 
      WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
        AND COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) > 0
      THEN COALESCE((rr.data->>'creditAmount')::DECIMAL, 0) / COALESCE((rr.data->>'quantity')::INTEGER, 1)
      ELSE 0 
    END
  ) AS price_that_should_be_stored,
  ud.report_date,
  ud.uploaded_at,
  rr.created_at AS source_created_at,
  COALESCE(ud.report_date::timestamp, ud.uploaded_at, rr.created_at) AS sort_date
FROM return_reports rr
JOIN uploaded_documents ud ON rr.document_id = ud.id
LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
WHERE 
  LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) = '60219174802'
  AND COALESCE((rr.data->>'full')::INTEGER, 0) > 0 
  AND COALESCE((rr.data->>'partial')::INTEGER, 0) = 0
ORDER BY 
  TRIM(COALESCE(rd.name, rr.data->>'reverseDistributor', rr.data->'reverseDistributorInfo'->>'name')),
  COALESCE(ud.report_date::timestamp, ud.uploaded_at, rr.created_at) DESC NULLS LAST;

-- DEBUG 3: Show what's actually stored in ndc_pricing_index
SELECT 
  distributor_name,
  price_per_unit AS actual_stored_price,
  is_full_record,
  report_date,
  uploaded_at,
  source_created_at,
  COALESCE(report_date::timestamp, uploaded_at, source_created_at) AS sort_date
FROM ndc_pricing_index
WHERE ndc_normalized = '60219174802'
  AND is_full_record = TRUE
ORDER BY distributor_name;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON ndc_pricing_index TO authenticated;
GRANT EXECUTE ON FUNCTION search_ndc_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION get_ndc_pricing_index TO authenticated;
