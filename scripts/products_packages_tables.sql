-- NDC Products and Packages Tables Schema
-- Run this script in your Supabase SQL Editor

-- NDC Products Table
CREATE TABLE IF NOT EXISTS ndc_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_ndc VARCHAR(20) NOT NULL,
  product_type_name VARCHAR(100),
  proprietary_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NDC Packages Table
CREATE TABLE IF NOT EXISTS ndc_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_ndc VARCHAR(20) NOT NULL,
  ndc_package_code VARCHAR(20) NOT NULL,
  package_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ndc_products_product_ndc ON ndc_products(product_ndc);
CREATE INDEX IF NOT EXISTS idx_ndc_products_proprietary_name ON ndc_products(proprietary_name);
CREATE INDEX IF NOT EXISTS idx_ndc_packages_ndc_package_code ON ndc_packages(ndc_package_code);
CREATE INDEX IF NOT EXISTS idx_ndc_packages_product_ndc ON ndc_packages(product_ndc);

-- Add comments
COMMENT ON TABLE ndc_products IS 'FDA NDC Product data';
COMMENT ON TABLE ndc_packages IS 'FDA NDC Package data';

