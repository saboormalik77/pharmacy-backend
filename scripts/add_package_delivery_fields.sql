-- ============================================================================
-- Add Delivery Information Fields to Custom Packages Table
-- ============================================================================
-- This migration adds fields to track delivery information when pharmacy marks
-- a package as delivered
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add delivery information columns to custom_packages table
ALTER TABLE custom_packages
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS received_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS delivery_condition VARCHAR(50) CHECK (delivery_condition IN ('good', 'damaged', 'partial', 'missing_items', 'other')),
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS carrier VARCHAR(50) CHECK (carrier IN ('UPS', 'FedEx', 'USPS', 'DHL', 'Other'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_packages_delivery_date ON custom_packages(delivery_date);
CREATE INDEX IF NOT EXISTS idx_custom_packages_tracking_number ON custom_packages(tracking_number);
CREATE INDEX IF NOT EXISTS idx_custom_packages_carrier ON custom_packages(carrier);

-- Add comments
COMMENT ON COLUMN custom_packages.delivery_date IS 'Date and time when the package was delivered/received by pharmacy';
COMMENT ON COLUMN custom_packages.received_by IS 'Name of the person who received the package at the pharmacy';
COMMENT ON COLUMN custom_packages.delivery_condition IS 'Condition of the package upon delivery (good, damaged, partial, missing_items, other)';
COMMENT ON COLUMN custom_packages.delivery_notes IS 'Additional notes about the delivery';
COMMENT ON COLUMN custom_packages.tracking_number IS 'Shipping tracking number for the package';
COMMENT ON COLUMN custom_packages.carrier IS 'Shipping carrier (UPS, FedEx, USPS, DHL, Other)';

