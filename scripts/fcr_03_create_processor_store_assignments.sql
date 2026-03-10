-- ============================================================
-- FCR Module 1 — Task 1.3: Create processor_store_assignments table
-- Run this in Supabase SQL Editor AFTER fcr_02
-- ============================================================

CREATE TABLE IF NOT EXISTS processor_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id UUID NOT NULL REFERENCES processors(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(processor_id, pharmacy_id)
);

-- Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_psa_processor ON processor_store_assignments(processor_id);
CREATE INDEX IF NOT EXISTS idx_psa_pharmacy ON processor_store_assignments(pharmacy_id);

-- RLS
ALTER TABLE processor_store_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access via service role" ON processor_store_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);
