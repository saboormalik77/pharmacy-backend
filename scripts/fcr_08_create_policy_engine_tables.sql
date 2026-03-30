-- ============================================================
-- FCR Module 5 — Policy Engine Tables + RPC Functions
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. Manufacturer Policies (one row per manufacturer/labeler)
CREATE TABLE IF NOT EXISTS manufacturer_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  labeler_id VARCHAR(10) NOT NULL,
  labeler_type TEXT NOT NULL DEFAULT 'generic'
    CHECK (labeler_type IN ('generic', 'brand')),
  manufacturer_name TEXT NOT NULL,

  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  main_contact TEXT,
  main_phone TEXT,
  fax TEXT,
  credit_request_email TEXT,

  contact_2_name TEXT,
  contact_2_phone TEXT,
  contact_2_email TEXT,

  average_pay_percent DECIMAL(5,2),
  average_days_to_pay INTEGER,

  verified_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(labeler_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_labeler_id ON manufacturer_policies(labeler_id);
CREATE INDEX IF NOT EXISTS idx_mp_manufacturer_name ON manufacturer_policies(manufacturer_name);

-- 1b. Manufacturer Return Policies (sub-records; one manufacturer can have multiple)
CREATE TABLE IF NOT EXISTS manufacturer_return_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  manufacturer_policy_id UUID NOT NULL
    REFERENCES manufacturer_policies(id) ON DELETE CASCADE,

  destination TEXT NOT NULL
    CHECK (destination IN ('inmar', 'qualanex', 'pharmalink', 'other')),
  auto_ra_email TEXT,

  policy_number INTEGER,
  policy_description TEXT,

  months_before_expiration INTEGER NOT NULL DEFAULT 6,
  months_after_expiration INTEGER NOT NULL DEFAULT 6,

  discount_rate DECIMAL(5,4),
  partials_accepted BOOLEAN NOT NULL DEFAULT false,
  partial_dosage_forms TEXT[],

  reimbursement_type TEXT NOT NULL DEFAULT 'batch'
    CHECK (reimbursement_type IN ('batch', 'per_item')),

  returnable_within_policy_period BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrp_policy_id ON manufacturer_return_policies(manufacturer_policy_id);

-- 1c. Non-Returnable Products (NDC-level exceptions per manufacturer)
CREATE TABLE IF NOT EXISTS non_returnable_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  manufacturer_policy_id UUID NOT NULL
    REFERENCES manufacturer_policies(id) ON DELETE CASCADE,

  ndc VARCHAR(13) NOT NULL,
  product_name TEXT,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nrp_policy_id ON non_returnable_products(manufacturer_policy_id);
CREATE INDEX IF NOT EXISTS idx_nrp_ndc ON non_returnable_products(ndc);

-- 1d. Manufacturer Policy Notes (dated entries with author)
CREATE TABLE IF NOT EXISTS manufacturer_policy_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  manufacturer_policy_id UUID NOT NULL
    REFERENCES manufacturer_policies(id) ON DELETE CASCADE,

  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_initials VARCHAR(10),
  note_text TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpn_policy_id ON manufacturer_policy_notes(manufacturer_policy_id);


-- ============================================================
-- 2. TRIGGERS (updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION update_mp_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mp_updated_at ON manufacturer_policies;
CREATE TRIGGER trg_mp_updated_at
  BEFORE UPDATE ON manufacturer_policies
  FOR EACH ROW EXECUTE FUNCTION update_mp_updated_at();

DROP TRIGGER IF EXISTS trg_mrp_updated_at ON manufacturer_return_policies;
CREATE TRIGGER trg_mrp_updated_at
  BEFORE UPDATE ON manufacturer_return_policies
  FOR EACH ROW EXECUTE FUNCTION update_mp_updated_at();


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE manufacturer_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON manufacturer_policies;
CREATE POLICY "Allow all access via service role" ON manufacturer_policies
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE manufacturer_return_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON manufacturer_return_policies;
CREATE POLICY "Allow all access via service role" ON manufacturer_return_policies
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE non_returnable_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON non_returnable_products;
CREATE POLICY "Allow all access via service role" ON non_returnable_products
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE manufacturer_policy_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON manufacturer_policy_notes;
CREATE POLICY "Allow all access via service role" ON manufacturer_policy_notes
  FOR ALL USING (true) WITH CHECK (true);
