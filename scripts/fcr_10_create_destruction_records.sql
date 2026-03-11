-- ============================================================
-- FCR-10: Create destruction_records table (Module 6)
--
-- Tracks items that are permanently non-returnable and routed
-- to destruction. Stores pickup info, forms, and weight.
-- ============================================================

-- 1. Create destruction status enum
DO $$ BEGIN
  CREATE TYPE destruction_status AS ENUM (
    'pending',
    'scheduled',
    'picked_up',
    'destroyed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create destruction_records table
CREATE TABLE IF NOT EXISTS destruction_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  transaction_item_id UUID REFERENCES return_transaction_items(id) ON DELETE SET NULL,
  ndc             VARCHAR(13),
  product_name    TEXT,
  manufacturer    TEXT,
  lot_number      TEXT,
  quantity        INTEGER DEFAULT 1,
  weight_lbs      DECIMAL(10, 4),
  destruction_reason TEXT NOT NULL DEFAULT 'non_returnable',
  status          destruction_status NOT NULL DEFAULT 'pending',
  federal_form_number TEXT,
  destruction_company TEXT,
  scheduled_date  DATE,
  picked_up_at    TIMESTAMPTZ,
  destroyed_at    TIMESTAMPTZ,
  form_url        TEXT,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_destruction_records_pharmacy
  ON destruction_records(pharmacy_id);

CREATE INDEX IF NOT EXISTS idx_destruction_records_status
  ON destruction_records(status);

CREATE INDEX IF NOT EXISTS idx_destruction_records_transaction_item
  ON destruction_records(transaction_item_id);

CREATE INDEX IF NOT EXISTS idx_destruction_records_ndc
  ON destruction_records(ndc);

CREATE INDEX IF NOT EXISTS idx_destruction_records_created_at
  ON destruction_records(created_at DESC);

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_destruction_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_destruction_records_updated_at ON destruction_records;
CREATE TRIGGER trg_destruction_records_updated_at
  BEFORE UPDATE ON destruction_records
  FOR EACH ROW
  EXECUTE FUNCTION update_destruction_records_updated_at();

-- 5. RLS
ALTER TABLE destruction_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on destruction_records"
  ON destruction_records
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin read destruction_records"
  ON destruction_records
  FOR SELECT
  USING (true);

-- ============================================================
-- Done. Run with: psql $DATABASE_URL -f scripts/fcr_10_create_destruction_records.sql
-- Or execute manually in Supabase SQL editor.
-- ============================================================
