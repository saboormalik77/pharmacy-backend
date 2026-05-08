-- ============================================================
-- Admin Settings Table
-- Stores system-wide admin settings for PharmAdmin
-- This is a singleton table (only one row)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure only one row
  
  -- General Settings
  site_name VARCHAR(255) DEFAULT 'PharmAdmin',
  site_email VARCHAR(255) DEFAULT 'admin@pharmadmin.com',
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  language VARCHAR(10) DEFAULT 'en',
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  document_approval_notif BOOLEAN DEFAULT true,
  payment_notif BOOLEAN DEFAULT true,
  shipment_notif BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Insert default settings if not exists
INSERT INTO public.admin_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Allow service_role to access admin_settings
CREATE POLICY "Service role can access admin_settings" ON public.admin_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.admin_settings IS 'System-wide admin settings for PharmAdmin (singleton table)';
COMMENT ON COLUMN public.admin_settings.id IS 'Always 1 - ensures only one settings row';
COMMENT ON COLUMN public.admin_settings.timezone IS 'System timezone (e.g., America/New_York, America/Chicago)';
COMMENT ON COLUMN public.admin_settings.language IS 'System language code (en, es, fr)';

