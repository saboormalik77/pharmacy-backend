-- ============================================================
-- Inventory Analysis Feature Schema
-- Purpose: Allow pharmacies to upload inventory files (CSV/PDF/TXT)
--          and get real-time recommendations on which products to
--          return to which manufacturers/distributors
-- ============================================================

-- 1. Pharmacy Inventory Upload History Table
-- Tracks all uploaded inventory files
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('csv', 'pdf', 'txt', 'xlsx')),
  file_size BIGINT NOT NULL,
  total_items INTEGER DEFAULT 0,
  total_value DECIMAL(12, 2) DEFAULT 0,
  items_to_return INTEGER DEFAULT 0,
  items_to_keep INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_pharmacy_id 
  ON public.pharmacy_inventory_uploads USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_created_at 
  ON public.pharmacy_inventory_uploads USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_status 
  ON public.pharmacy_inventory_uploads USING btree (status);

-- 2. Pharmacy Inventory Items Table
-- Stores individual items from uploaded inventory files
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES pharmacy_inventory_uploads(id) ON DELETE CASCADE,
  ndc_code VARCHAR(20) NOT NULL,
  ndc_normalized VARCHAR(20),
  product_name VARCHAR(500),
  manufacturer VARCHAR(500),
  quantity INTEGER NOT NULL DEFAULT 1,
  full_units INTEGER DEFAULT 0,
  partial_units INTEGER DEFAULT 0,
  expiration_date DATE,
  lot_number VARCHAR(100),
  acquisition_cost DECIMAL(10, 2),
  -- Recommendation fields
  recommendation_type VARCHAR(20) DEFAULT 'pending' 
    CHECK (recommendation_type IN ('return_now', 'keep', 'monitor', 'pending', 'no_data')),
  recommended_distributor_id UUID REFERENCES reverse_distributors(id),
  recommended_distributor_name VARCHAR(500),
  estimated_return_value DECIMAL(10, 2) DEFAULT 0,
  best_full_price DECIMAL(10, 2) DEFAULT 0,
  best_partial_price DECIMAL(10, 2) DEFAULT 0,
  confidence_score INTEGER DEFAULT 0, -- 0-100
  recommendation_reason TEXT,
  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'returned', 'expired', 'dismissed')),
  returned_at TIMESTAMP WITH TIME ZONE,
  returned_to_distributor_id UUID REFERENCES reverse_distributors(id),
  actual_return_value DECIMAL(10, 2),
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_pharmacy_id 
  ON public.pharmacy_inventory_items USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_upload_id 
  ON public.pharmacy_inventory_items USING btree (upload_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_ndc_normalized 
  ON public.pharmacy_inventory_items USING btree (ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_recommendation_type 
  ON public.pharmacy_inventory_items USING btree (recommendation_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_status 
  ON public.pharmacy_inventory_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_expiration_date 
  ON public.pharmacy_inventory_items USING btree (expiration_date);

-- 3. Inventory Reminders Table
-- Scheduled reminders for pharmacy inventory follow-ups
CREATE TABLE IF NOT EXISTS public.inventory_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL 
    CHECK (reminder_type IN ('monthly_review', 'expiration_warning', 'return_opportunity', 'price_increase')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  -- Related data
  total_items INTEGER DEFAULT 0,
  total_potential_value DECIMAL(12, 2) DEFAULT 0,
  items_summary JSONB, -- Array of top items to return
  -- Email tracking
  email_sent_to VARCHAR(255),
  email_opened_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_inventory_reminders_pharmacy_id 
  ON public.inventory_reminders USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reminders_scheduled_for 
  ON public.inventory_reminders USING btree (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_inventory_reminders_status 
  ON public.inventory_reminders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_inventory_reminders_reminder_type 
  ON public.inventory_reminders USING btree (reminder_type);

-- 4. Note: Pricing lookup is done via TypeScript service
-- The return_reports table stores data in a JSONB 'data' column
-- Pricing extraction is handled by the inventoryAnalysisService.ts
-- which uses the same approach as optimizationService.ts

-- 5. RPC Function to get pending reminders to send
CREATE OR REPLACE FUNCTION get_pending_inventory_reminders(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  pharmacy_id UUID,
  pharmacy_email VARCHAR(255),
  pharmacy_name VARCHAR(255),
  reminder_type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  total_items INTEGER,
  total_potential_value DECIMAL(12, 2),
  items_summary JSONB,
  scheduled_for TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ir.id,
    ir.pharmacy_id,
    p.email AS pharmacy_email,
    p.name AS pharmacy_name,
    ir.reminder_type,
    ir.title,
    ir.message,
    ir.total_items,
    ir.total_potential_value,
    ir.items_summary,
    ir.scheduled_for
  FROM inventory_reminders ir
  JOIN pharmacy p ON p.id = ir.pharmacy_id
  WHERE ir.status = 'pending'
    AND ir.scheduled_for <= NOW()
  ORDER BY ir.scheduled_for ASC
  LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC Function to get inventory summary for a pharmacy
CREATE OR REPLACE FUNCTION get_pharmacy_inventory_summary(
  p_pharmacy_id UUID
)
RETURNS TABLE (
  total_items BIGINT,
  items_to_return BIGINT,
  items_to_keep BIGINT,
  total_potential_value DECIMAL,
  items_by_recommendation JSONB,
  top_return_items JSONB,
  upcoming_expirations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH item_stats AS (
    SELECT 
      COUNT(*) AS total_items,
      COUNT(*) FILTER (WHERE recommendation_type = 'return_now') AS items_to_return,
      COUNT(*) FILTER (WHERE recommendation_type IN ('keep', 'monitor')) AS items_to_keep,
      COALESCE(SUM(estimated_return_value) FILTER (WHERE recommendation_type = 'return_now'), 0) AS total_potential_value,
      COUNT(*) FILTER (WHERE expiration_date IS NOT NULL AND expiration_date <= CURRENT_DATE + INTERVAL '90 days') AS upcoming_expirations
    FROM pharmacy_inventory_items
    WHERE pharmacy_id = p_pharmacy_id
      AND status = 'active'
  ),
  by_recommendation AS (
    SELECT jsonb_object_agg(
      recommendation_type,
      cnt
    ) AS items_by_recommendation
    FROM (
      SELECT recommendation_type, COUNT(*) AS cnt
      FROM pharmacy_inventory_items
      WHERE pharmacy_id = p_pharmacy_id
        AND status = 'active'
      GROUP BY recommendation_type
    ) sub
  ),
  top_items AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'ndc_code', ndc_code,
        'product_name', product_name,
        'quantity', quantity,
        'estimated_return_value', estimated_return_value,
        'recommended_distributor', recommended_distributor_name,
        'expiration_date', expiration_date
      ) ORDER BY estimated_return_value DESC
    ) AS top_return_items
    FROM (
      SELECT id, ndc_code, product_name, quantity, estimated_return_value, 
             recommended_distributor_name, expiration_date
      FROM pharmacy_inventory_items
      WHERE pharmacy_id = p_pharmacy_id
        AND status = 'active'
        AND recommendation_type = 'return_now'
      ORDER BY estimated_return_value DESC
      LIMIT 10
    ) sub
  )
  SELECT 
    COALESCE(s.total_items, 0),
    COALESCE(s.items_to_return, 0),
    COALESCE(s.items_to_keep, 0),
    COALESCE(s.total_potential_value, 0),
    COALESCE(r.items_by_recommendation, '{}'::jsonb),
    COALESCE(t.top_return_items, '[]'::jsonb),
    COALESCE(s.upcoming_expirations, 0)
  FROM item_stats s
  CROSS JOIN by_recommendation r
  CROSS JOIN top_items t;
END;
$$ LANGUAGE plpgsql;

-- 7. Enable Row Level Security
ALTER TABLE public.pharmacy_inventory_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Pharmacies can view own inventory uploads" ON public.pharmacy_inventory_uploads;
DROP POLICY IF EXISTS "Service role full access to inventory uploads" ON public.pharmacy_inventory_uploads;
DROP POLICY IF EXISTS "Pharmacies can view own inventory items" ON public.pharmacy_inventory_items;
DROP POLICY IF EXISTS "Service role full access to inventory items" ON public.pharmacy_inventory_items;
DROP POLICY IF EXISTS "Pharmacies can view own reminders" ON public.inventory_reminders;
DROP POLICY IF EXISTS "Service role full access to reminders" ON public.inventory_reminders;

-- RLS Policies
CREATE POLICY "Pharmacies can view own inventory uploads" ON public.pharmacy_inventory_uploads
  FOR SELECT TO authenticated
  USING (pharmacy_id = auth.uid());

CREATE POLICY "Service role full access to inventory uploads" ON public.pharmacy_inventory_uploads
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Pharmacies can view own inventory items" ON public.pharmacy_inventory_items
  FOR SELECT TO authenticated
  USING (pharmacy_id = auth.uid());

CREATE POLICY "Service role full access to inventory items" ON public.pharmacy_inventory_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Pharmacies can view own reminders" ON public.inventory_reminders
  FOR SELECT TO authenticated
  USING (pharmacy_id = auth.uid());

CREATE POLICY "Service role full access to reminders" ON public.inventory_reminders
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.pharmacy_inventory_uploads IS 'Tracks uploaded inventory files from pharmacies';
COMMENT ON TABLE public.pharmacy_inventory_items IS 'Individual inventory items with return recommendations';
COMMENT ON TABLE public.inventory_reminders IS 'Scheduled reminders for inventory follow-ups';
COMMENT ON FUNCTION get_inventory_item_pricing IS 'Gets pricing data for NDC codes from return reports';
COMMENT ON FUNCTION get_pending_inventory_reminders IS 'Gets pending reminders ready to be sent';
COMMENT ON FUNCTION get_pharmacy_inventory_summary IS 'Gets inventory summary statistics for a pharmacy';

