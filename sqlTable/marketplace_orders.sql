-- ============================================================
-- Marketplace Orders Tables
-- Stores order and payment information for marketplace purchases
-- ============================================================

-- ============================================================
-- 1. MARKETPLACE_ORDERS TABLE
-- Main order table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated: ORD-001, ORD-002, etc.
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacy(id) ON DELETE RESTRICT,
  
  -- Order Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Order created, awaiting payment
    'processing',        -- Payment processing
    'paid',              -- Payment confirmed
    'confirmed',         -- Order confirmed by admin
    'shipped',           -- Order shipped
    'delivered',         -- Order delivered
    'cancelled',         -- Order cancelled
    'refunded'           -- Order refunded
  )),
  
  -- Order Totals
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.08, -- 8% tax rate
  shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  total_savings NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_savings >= 0),
  
  -- Stripe Payment Info
  stripe_checkout_session_id VARCHAR(255) NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  stripe_customer_id VARCHAR(255) NULL,
  stripe_payment_method_id VARCHAR(255) NULL,
  stripe_payment_status VARCHAR(50) NULL,
  stripe_receipt_url TEXT NULL,
  
  -- Payment Method Details (denormalized)
  payment_method_type VARCHAR(50) NULL, -- 'card', 'bank_transfer', etc.
  payment_method_last4 VARCHAR(4) NULL,
  payment_method_brand VARCHAR(50) NULL, -- 'visa', 'mastercard', etc.
  
  -- Shipping Info (optional for future use)
  shipping_address JSONB NULL,
  shipping_method VARCHAR(100) NULL,
  tracking_number VARCHAR(255) NULL,
  
  -- Notes
  notes TEXT NULL,
  internal_notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  shipped_at TIMESTAMP WITH TIME ZONE NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE NULL
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_pharmacy ON public.marketplace_orders(pharmacy_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON public.marketplace_orders(status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_session ON public.marketplace_orders(stripe_checkout_session_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_payment ON public.marketplace_orders(stripe_payment_intent_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created ON public.marketplace_orders(created_at DESC) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- Allow service_role to access
DROP POLICY IF EXISTS "Service role can access marketplace_orders" ON public.marketplace_orders;
CREATE POLICY "Service role can access marketplace_orders" ON public.marketplace_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS marketplace_order_number_seq START 1;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || LPAD(nextval('marketplace_order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
DROP TRIGGER IF EXISTS set_order_number ON public.marketplace_orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- 2. MARKETPLACE_ORDER_ITEMS TABLE
-- Items in each order
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.marketplace_deals(id) ON DELETE RESTRICT,
  
  -- Item details (denormalized at time of purchase)
  product_name VARCHAR(500) NOT NULL,
  ndc VARCHAR(50) NULL,
  category VARCHAR(100) NULL,
  distributor VARCHAR(255) NULL,
  
  -- Pricing at time of purchase
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
  original_price NUMERIC(10, 2) NOT NULL CHECK (original_price > 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  line_savings NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_savings >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.marketplace_order_items(order_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_order_items_deal ON public.marketplace_order_items(deal_id) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- Allow service_role to access
DROP POLICY IF EXISTS "Service role can access marketplace_order_items" ON public.marketplace_order_items;
CREATE POLICY "Service role can access marketplace_order_items" ON public.marketplace_order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for marketplace_orders
DROP TRIGGER IF EXISTS update_marketplace_orders_updated_at ON public.marketplace_orders;
CREATE TRIGGER update_marketplace_orders_updated_at
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_updated_at();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.marketplace_orders IS 'Marketplace orders placed by pharmacies';
COMMENT ON TABLE public.marketplace_order_items IS 'Items in marketplace orders';
COMMENT ON COLUMN public.marketplace_orders.order_number IS 'Auto-generated order number (ORD-000001, etc.)';
COMMENT ON COLUMN public.marketplace_orders.stripe_checkout_session_id IS 'Stripe Checkout session ID';
COMMENT ON COLUMN public.marketplace_orders.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for tracking payment';

