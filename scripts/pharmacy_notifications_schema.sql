-- ============================================================
-- Pharmacy Notifications Schema
-- Purpose: Store notifications for pharmacies about expiring products
-- ============================================================

-- Pharmacy Notifications Table
-- Stores notifications sent to pharmacies about expiring inventory
CREATE TABLE IF NOT EXISTS public.pharmacy_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  
  -- Notification content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL 
    CHECK (notification_type IN ('expiring_product', 'monthly_reminder', 'price_update', 'return_opportunity')),
  
  -- Product details (for expiring_product type)
  ndc_code VARCHAR(20),
  product_name VARCHAR(500),
  expiration_date DATE,
  days_until_expiration INTEGER,
  
  -- Pricing details (saved at notification creation time)
  full_units INTEGER DEFAULT 0,
  partial_units INTEGER DEFAULT 0,
  full_price DECIMAL(10, 2) DEFAULT 0,
  partial_price DECIMAL(10, 2) DEFAULT 0,
  total_potential_value DECIMAL(12, 2) DEFAULT 0,
  
  -- Recommended distributor
  recommended_distributor_id UUID REFERENCES reverse_distributors(id),
  recommended_distributor_name VARCHAR(500),
  
  -- Status
  status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed', 'acted_on')),
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  
  -- Related item (if applicable)
  inventory_item_id UUID REFERENCES pharmacy_inventory_items(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_pharmacy_id 
  ON public.pharmacy_notifications USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_status 
  ON public.pharmacy_notifications USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_type 
  ON public.pharmacy_notifications USING btree (notification_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_created_at 
  ON public.pharmacy_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_ndc 
  ON public.pharmacy_notifications USING btree (ndc_code);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pharmacy_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pharmacy_notifications_updated_at ON public.pharmacy_notifications;
CREATE TRIGGER pharmacy_notifications_updated_at
  BEFORE UPDATE ON public.pharmacy_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_pharmacy_notifications_updated_at();

-- Enable RLS
ALTER TABLE public.pharmacy_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS pharmacy_notifications_select_policy ON public.pharmacy_notifications;
DROP POLICY IF EXISTS pharmacy_notifications_service_policy ON public.pharmacy_notifications;

-- RLS Policy: Users can only see notifications for their pharmacy
CREATE POLICY pharmacy_notifications_select_policy ON public.pharmacy_notifications
  FOR SELECT TO authenticated
  USING (pharmacy_id = auth.uid());

-- Allow backend service role to manage all notifications
CREATE POLICY pharmacy_notifications_service_policy ON public.pharmacy_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

