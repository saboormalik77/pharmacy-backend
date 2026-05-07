-- ============================================================
-- Marketplace Deals Table
-- Stores pharmaceutical deals from distributors
-- ============================================================
-- Status: active, sold, expired
-- Unit: bottles, boxes, units, packs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_number VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated: DEAL-001, DEAL-002, etc.
  
  -- Product Information
  product_name VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  ndc VARCHAR(50) NULL, -- Optional NDC reference
  
  -- Quantity
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'bottles' CHECK (unit IN ('bottles', 'boxes', 'units', 'packs')),
  
  -- Pricing
  original_price NUMERIC(10, 2) NOT NULL CHECK (original_price > 0),
  deal_price NUMERIC(10, 2) NOT NULL CHECK (deal_price > 0),
  
  -- Distributor Information
  distributor_id UUID NULL REFERENCES public.reverse_distributors(id) ON DELETE SET NULL,
  distributor_name VARCHAR(255) NOT NULL,
  
  -- Dates
  expiry_date DATE NOT NULL,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired')),
  
  -- Metadata
  notes TEXT NULL,
  created_by UUID NULL REFERENCES public.admin(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_status ON public.marketplace_deals(status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_category ON public.marketplace_deals(category) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_distributor ON public.marketplace_deals(distributor_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_expiry ON public.marketplace_deals(expiry_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_posted ON public.marketplace_deals(posted_date DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_product ON public.marketplace_deals(product_name) TABLESPACE pg_default;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_search ON public.marketplace_deals 
  USING gin(to_tsvector('english', product_name || ' ' || distributor_name || ' ' || category));

-- Enable Row Level Security
ALTER TABLE public.marketplace_deals ENABLE ROW LEVEL SECURITY;

-- Allow service_role to access
CREATE POLICY "Service role can access marketplace_deals" ON public.marketplace_deals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sequence for deal numbers
CREATE SEQUENCE IF NOT EXISTS marketplace_deal_number_seq START 1;

-- Function to generate deal number
CREATE OR REPLACE FUNCTION generate_deal_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deal_number IS NULL THEN
    NEW.deal_number := 'DEAL-' || LPAD(nextval('marketplace_deal_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate deal number
DROP TRIGGER IF EXISTS set_deal_number ON public.marketplace_deals;
CREATE TRIGGER set_deal_number
  BEFORE INSERT ON public.marketplace_deals
  FOR EACH ROW
  EXECUTE FUNCTION generate_deal_number();

-- Function to auto-update expired deals (can be called periodically)
CREATE OR REPLACE FUNCTION update_expired_marketplace_deals()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.marketplace_deals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expiry_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.marketplace_deals IS 'Pharmaceutical deals from distributors for the admin marketplace';
COMMENT ON COLUMN public.marketplace_deals.deal_number IS 'Auto-generated unique deal identifier (DEAL-001, DEAL-002, etc.)';
COMMENT ON COLUMN public.marketplace_deals.unit IS 'Unit type: bottles, boxes, units, packs';
COMMENT ON COLUMN public.marketplace_deals.status IS 'Deal status: active, sold, expired';

