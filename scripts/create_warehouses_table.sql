-- ============================================================
-- Create Warehouses Table for MainAdmin Portal
-- ============================================================
-- This separates warehouse management from admin_settings,
-- allowing MainAdmin to manage multiple warehouses independently
-- from buying group business settings.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Warehouse Details
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  
  -- Address Information
  street TEXT,
  city VARCHAR(100),
  state VARCHAR(10),
  zip VARCHAR(20),
  country VARCHAR(10) DEFAULT 'US',
  
  -- Status and Management
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- One warehouse can be marked as default
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admin(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admin(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- ============================================================
-- Indexes and Constraints
-- ============================================================

-- Ensure only one default warehouse
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_unique_default 
  ON warehouses(is_default) 
  WHERE is_default = true;

-- Index for active warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_active 
  ON warehouses(is_active);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_warehouses_created_at 
  ON warehouses(created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Allow service_role to access warehouses
CREATE POLICY "Service role can access warehouses" ON public.warehouses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- MainAdmin access policy (assuming they have a specific role or identifier)
CREATE POLICY "MainAdmin can access warehouses" ON public.warehouses
  FOR ALL
  TO authenticated
  USING (
    -- Allow access for MainAdmin users (you can adjust this condition)
    EXISTS (
      SELECT 1 FROM admin 
      WHERE admin.id = auth.uid() 
      AND (admin.role = 'main_admin' OR admin.email LIKE '%@pharmadmin.com')
    )
  );

-- ============================================================
-- Migrate Existing Warehouse Data from admin_settings
-- ============================================================

-- Insert warehouse data from your provided JSON
INSERT INTO public.warehouses (
  name, contact_name, phone, street, city, state, zip, country, 
  is_active, is_default, created_at, updated_at
)
VALUES (
  'truemedit warehouse',
  'Saboor Malik',
  '4695557890',
  '14951 Dallas Pkwy, Suite 300',
  'Addison',
  'TX',
  '75001',
  'US',
  true,
  true, -- Mark as default
  '2025-12-24 10:24:22.912854+00'::timestamp with time zone,
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE public.warehouses IS 'Warehouse management for MainAdmin portal, separate from buying group business settings';
COMMENT ON COLUMN public.warehouses.is_default IS 'Only one warehouse can be marked as default for system-wide operations';
COMMENT ON COLUMN public.warehouses.is_active IS 'Whether this warehouse is currently active and available for operations';

-- ============================================================
-- Verification Query
-- ============================================================

-- Verify the warehouse was created
DO $$
DECLARE
  v_warehouse_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_warehouse_count FROM warehouses;
  RAISE NOTICE '=== Warehouses Table Created ===';
  RAISE NOTICE 'Total warehouses: %', v_warehouse_count;
  
  IF v_warehouse_count > 0 THEN
    RAISE NOTICE '✅ Warehouse data migrated successfully';
  ELSE
    RAISE NOTICE '⚠️  No warehouse data found - please check migration';
  END IF;
END $$;