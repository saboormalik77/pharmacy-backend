-- Custom Packages Tables Schema
-- Run this script in your Supabase SQL Editor

-- Custom Packages Table
CREATE TABLE IF NOT EXISTS custom_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_number VARCHAR(100) UNIQUE NOT NULL,
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  distributor_name VARCHAR(255) NOT NULL,
  distributor_id UUID REFERENCES reverse_distributors(id),
  total_items INTEGER DEFAULT 0,
  total_estimated_value DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_ship', 'in_transit', 'received', 'processed', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Package Items Table
CREATE TABLE IF NOT EXISTS custom_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES custom_packages(id) ON DELETE CASCADE,
  ndc VARCHAR(50) NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_packages_pharmacy_id ON custom_packages(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_package_number ON custom_packages(package_number);
CREATE INDEX IF NOT EXISTS idx_custom_packages_status ON custom_packages(status);
CREATE INDEX IF NOT EXISTS idx_custom_packages_distributor_id ON custom_packages(distributor_id);
CREATE INDEX IF NOT EXISTS idx_custom_package_items_package_id ON custom_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_custom_package_items_ndc ON custom_package_items(ndc);

-- Add comments
COMMENT ON TABLE custom_packages IS 'Custom packages created by pharmacies from optimization suggestions';
COMMENT ON TABLE custom_package_items IS 'Items in custom packages';

