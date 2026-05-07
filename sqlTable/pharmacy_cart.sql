-- ============================================================
-- Pharmacy Cart Tables
-- Stores shopping cart data for pharmacies in the marketplace
-- ============================================================

-- ============================================================
-- 1. PHARMACY_CART TABLE
-- One cart per pharmacy
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pharmacy_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacy(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one cart per pharmacy
  CONSTRAINT unique_pharmacy_cart UNIQUE (pharmacy_id)
) TABLESPACE pg_default;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_cart_pharmacy ON public.pharmacy_cart(pharmacy_id) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.pharmacy_cart ENABLE ROW LEVEL SECURITY;

-- Allow service_role to access
DROP POLICY IF EXISTS "Service role can access pharmacy_cart" ON public.pharmacy_cart;
CREATE POLICY "Service role can access pharmacy_cart" ON public.pharmacy_cart
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. PHARMACY_CART_ITEMS TABLE
-- Individual items in the cart
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pharmacy_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.pharmacy_cart(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.marketplace_deals(id) ON DELETE CASCADE,
  
  -- Item details (denormalized for performance)
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
  original_price NUMERIC(10, 2) NOT NULL CHECK (original_price > 0),
  
  -- Timestamps
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique deal per cart (one entry per deal in cart)
  CONSTRAINT unique_cart_deal UNIQUE (cart_id, deal_id)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.pharmacy_cart_items(cart_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_cart_items_deal ON public.pharmacy_cart_items(deal_id) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.pharmacy_cart_items ENABLE ROW LEVEL SECURITY;

-- Allow service_role to access
DROP POLICY IF EXISTS "Service role can access pharmacy_cart_items" ON public.pharmacy_cart_items;
CREATE POLICY "Service role can access pharmacy_cart_items" ON public.pharmacy_cart_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for pharmacy_cart
DROP TRIGGER IF EXISTS update_pharmacy_cart_updated_at ON public.pharmacy_cart;
CREATE TRIGGER update_pharmacy_cart_updated_at
  BEFORE UPDATE ON public.pharmacy_cart
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_updated_at();

-- Trigger for pharmacy_cart_items
DROP TRIGGER IF EXISTS update_pharmacy_cart_items_updated_at ON public.pharmacy_cart_items;
CREATE TRIGGER update_pharmacy_cart_items_updated_at
  BEFORE UPDATE ON public.pharmacy_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_updated_at();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.pharmacy_cart IS 'Shopping cart for pharmacies in the marketplace';
COMMENT ON TABLE public.pharmacy_cart_items IS 'Individual items in pharmacy shopping carts';
COMMENT ON COLUMN public.pharmacy_cart_items.unit_price IS 'Deal price at time of adding to cart';
COMMENT ON COLUMN public.pharmacy_cart_items.original_price IS 'Original price for savings calculation';

