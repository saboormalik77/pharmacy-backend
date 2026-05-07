-- Pharmacy Table Migration Script
-- Run this script in your Supabase SQL Editor
-- This table is linked to Supabase Auth users

-- Drop existing tables if you need to recreate (uncomment if needed)
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS warehouse_orders CASCADE;
-- DROP TABLE IF EXISTS warehouse_packages CASCADE;
-- DROP TABLE IF EXISTS shipments CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS marketplace_listings CASCADE;
-- DROP TABLE IF EXISTS credits CASCADE;
-- DROP TABLE IF EXISTS return_items CASCADE;
-- DROP TABLE IF EXISTS returns CASCADE;
-- DROP TABLE IF EXISTS inventory_items CASCADE;
-- DROP TABLE IF EXISTS uploaded_documents CASCADE;
-- DROP TABLE IF EXISTS pricing_data CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS reverse_distributors CASCADE;
-- DROP TABLE IF EXISTS product_lists CASCADE;
-- DROP TABLE IF EXISTS pharmacy CASCADE;

-- Pharmacy Table
CREATE TABLE IF NOT EXISTS pharmacy (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  pharmacy_name VARCHAR(255) NOT NULL,
  npi_number VARCHAR(50),
  dea_number VARCHAR(50),
  contact_phone VARCHAR(20),
  physical_address JSONB,
  billing_address JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled', 'past_due')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reverse Distributors Table
CREATE TABLE IF NOT EXISTS reverse_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address JSONB,
  portal_url TEXT,
  supported_formats TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ndc VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  manufacturer VARCHAR(255),
  strength VARCHAR(100),
  dosage_form VARCHAR(100),
  package_size INTEGER,
  wac DECIMAL(10, 2),
  awp DECIMAL(10, 2),
  dea_schedule VARCHAR(10),
  return_eligibility JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uploaded Documents Table
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100),
  file_url TEXT,
  reverse_distributor_id UUID REFERENCES reverse_distributors(id),
  source VARCHAR(50) DEFAULT 'manual_upload' CHECK (source IN ('manual_upload', 'email_forward', 'portal_fetch', 'api')),
  status VARCHAR(50) DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'failed', 'needs_review')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  extracted_items INTEGER DEFAULT 0,
  total_credit_amount DECIMAL(10, 2),
  processing_progress INTEGER DEFAULT 0
);

-- Return Reports Table
CREATE TABLE IF NOT EXISTS return_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing Data Table
CREATE TABLE IF NOT EXISTS pricing_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  reverse_distributor_id UUID REFERENCES reverse_distributors(id),
  ndc VARCHAR(50) NOT NULL,
  product_name VARCHAR(500),
  manufacturer VARCHAR(255),
  lot_number VARCHAR(100),
  expiration_date DATE,
  quantity INTEGER,
  credit_amount DECIMAL(10, 2),
  price_per_unit DECIMAL(10, 2),
  document_id UUID REFERENCES uploaded_documents(id),
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Lists Table
CREATE TABLE IF NOT EXISTS product_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product List Items Table
CREATE TABLE IF NOT EXISTS product_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ndc VARCHAR(50) NOT NULL,
  product_name VARCHAR(500),
  full_units INTEGER NOT NULL,
  partial_units INTEGER NOT NULL,
  lot_number VARCHAR(100),
  expiration_date DATE,
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  CONSTRAINT product_list_items_units_check CHECK (
    (full_units = 0 AND partial_units > 0) OR 
    (full_units > 0 AND partial_units = 0)
  ),
  CONSTRAINT product_list_items_full_units_check CHECK (full_units >= 0),
  CONSTRAINT product_list_items_partial_units_check CHECK (partial_units >= 0)
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  ndc VARCHAR(50) NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit VARCHAR(50),
  location VARCHAR(255),
  boxes INTEGER,
  tablets_per_box INTEGER,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
  days_until_expiration INTEGER,
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_ship', 'in_transit', 'processing', 'completed', 'cancelled')),
  total_estimated_credit DECIMAL(10, 2) DEFAULT 0,
  shipment_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Return Items Table
CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id),
  ndc VARCHAR(50) NOT NULL,
  drug_name VARCHAR(500) NOT NULL,
  manufacturer VARCHAR(255),
  lot_number VARCHAR(100) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit VARCHAR(50),
  reason TEXT,
  estimated_credit DECIMAL(10, 2),
  classification VARCHAR(50) CHECK (classification IN ('returnable', 'destruction', 'pending')),
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id),
  tracking_number VARCHAR(100) UNIQUE,
  carrier VARCHAR(50) CHECK (carrier IN ('UPS', 'FedEx', 'USPS')),
  service_level VARCHAR(100),
  status VARCHAR(50) DEFAULT 'label_created' CHECK (status IN ('label_created', 'picked_up', 'in_transit', 'delivered', 'exception')),
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  events JSONB[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credits Table
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id),
  return_item_id UUID REFERENCES return_items(id),
  drug_name VARCHAR(500),
  manufacturer VARCHAR(255),
  expected_amount DECIMAL(10, 2),
  actual_amount DECIMAL(10, 2),
  variance DECIMAL(10, 2),
  expected_payment_date DATE,
  actual_payment_date DATE,
  status VARCHAR(50) DEFAULT 'expected' CHECK (status IN ('expected', 'received', 'overdue', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace Listings Table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  ndc VARCHAR(50) NOT NULL,
  drug_name VARCHAR(500) NOT NULL,
  strength VARCHAR(100),
  manufacturer VARCHAR(255),
  lot_number VARCHAR(100) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit VARCHAR(50),
  price_per_unit DECIMAL(10, 2) NOT NULL,
  wac_price DECIMAL(10, 2),
  condition VARCHAR(100),
  photos TEXT[],
  status VARCHAR(50) DEFAULT 'pending_approval' CHECK (status IN ('active', 'sold', 'expired', 'pending_approval')),
  location JSONB,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id),
  buyer_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  drug_name VARCHAR(500),
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  tracking_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Warehouse Packages Table
CREATE TABLE IF NOT EXISTS warehouse_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_number VARCHAR(100) UNIQUE NOT NULL,
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_ship', 'in_transit', 'received', 'inspected', 'processed', 'completed')),
  total_items INTEGER DEFAULT 0,
  total_estimated_value DECIMAL(10, 2) DEFAULT 0,
  shipment_id UUID REFERENCES shipments(id),
  tracking_number VARCHAR(100),
  carrier VARCHAR(50) CHECK (carrier IN ('UPS', 'FedEx', 'USPS')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse Package Items Table
CREATE TABLE IF NOT EXISTS warehouse_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES warehouse_packages(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id),
  ndc VARCHAR(50) NOT NULL,
  drug_name VARCHAR(500) NOT NULL,
  manufacturer VARCHAR(255),
  lot_number VARCHAR(100) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit VARCHAR(50),
  reason VARCHAR(100) CHECK (reason IN ('expired', 'expiring_soon', 'damaged', 'recalled', 'other')),
  estimated_credit DECIMAL(10, 2),
  classification VARCHAR(50) CHECK (classification IN ('returnable', 'destruction', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse Orders Table
CREATE TABLE IF NOT EXISTS warehouse_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(100) UNIQUE NOT NULL,
  package_id UUID REFERENCES warehouse_packages(id),
  return_id UUID REFERENCES returns(id),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'inspecting', 'classifying', 'processing', 'completed', 'exception')),
  total_items INTEGER DEFAULT 0,
  refundable_items INTEGER DEFAULT 0,
  non_refundable_items INTEGER DEFAULT 0,
  total_estimated_credit DECIMAL(10, 2) DEFAULT 0,
  actual_credit DECIMAL(10, 2),
  variance DECIMAL(10, 2),
  received_by UUID REFERENCES auth.users(id),
  inspected_by UUID REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse Packages in Orders (Many-to-Many)
CREATE TABLE IF NOT EXISTS warehouse_order_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_order_id UUID NOT NULL REFERENCES warehouse_orders(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES warehouse_packages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('document_processed', 'price_alert', 'subscription', 'system', 'recommendation_ready', 'credit_received', 'shipment_update', 'order_status')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'basic', 'premium', 'enterprise')),
  status VARCHAR(50) DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'expired', 'cancelled', 'past_due')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_method JSONB,
  price DECIMAL(10, 2),
  billing_interval VARCHAR(20) CHECK (billing_interval IN ('monthly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_email ON pharmacy(email);
CREATE INDEX IF NOT EXISTS idx_return_reports_document_id ON return_reports(document_id);
CREATE INDEX IF NOT EXISTS idx_return_reports_pharmacy_id ON return_reports(pharmacy_id);

-- Add comment to table
COMMENT ON TABLE pharmacy IS 'Stores pharmacy user information linked to Supabase Auth users';
COMMENT ON TABLE return_reports IS 'Stores return report data with items array as JSONB';

