-- ============================================================
-- FCR Module 1 — Task 1.2: Create processors table
-- Run this in Supabase SQL Editor AFTER fcr_01
-- ============================================================

CREATE TABLE IF NOT EXISTS processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processors_status ON processors(status);
CREATE INDEX IF NOT EXISTS idx_processors_email ON processors(email);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_processors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_processors_updated_at ON processors;
CREATE TRIGGER trg_processors_updated_at
  BEFORE UPDATE ON processors
  FOR EACH ROW
  EXECUTE FUNCTION update_processors_updated_at();

-- Now add the FK from pharmacy.assigned_processor_id -> processors.id
ALTER TABLE pharmacy
  DROP CONSTRAINT IF EXISTS fk_pharmacy_assigned_processor;
ALTER TABLE pharmacy
  ADD CONSTRAINT fk_pharmacy_assigned_processor
  FOREIGN KEY (assigned_processor_id) REFERENCES processors(id)
  ON DELETE SET NULL;

-- Disable RLS for now (admin-only table, accessed via service role key)
ALTER TABLE processors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access via service role" ON processors
  FOR ALL
  USING (true)
  WITH CHECK (true);
