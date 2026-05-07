-- =====================================================
-- UPDATE PHARMACY TABLE SCHEMA
-- Add missing fields for pharmacy management
-- =====================================================

-- Use DO block to add columns conditionally
DO $$
BEGIN
    -- Add contact_phone if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'contact_phone'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN contact_phone VARCHAR(20);
    END IF;

    -- Add physical_address (JSONB) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'physical_address'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN physical_address JSONB;
        COMMENT ON COLUMN pharmacy.physical_address IS 'Physical address stored as {street, city, state, zip}';
    END IF;

    -- Add billing_address (JSONB) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'billing_address'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN billing_address JSONB;
        COMMENT ON COLUMN pharmacy.billing_address IS 'Billing address stored as {street, city, state, zip}';
    END IF;

    -- Add status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'status'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;

    -- Add state_license_number if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'state_license_number'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN state_license_number VARCHAR(100);
        COMMENT ON COLUMN pharmacy.state_license_number IS 'State pharmacy license number (e.g., NY-12345, CA-67890)';
    END IF;

    -- Add license_expiry_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'license_expiry_date'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN license_expiry_date DATE;
        COMMENT ON COLUMN pharmacy.license_expiry_date IS 'Expiration date of the pharmacy license';
    END IF;

    -- Add subscription_tier if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
    END IF;

    -- Add subscription_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trial';
    END IF;

    -- Add trial_ends_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy' AND column_name = 'trial_ends_at'
    ) THEN
        ALTER TABLE pharmacy ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Drop existing status constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'pharmacy_status_check'
        AND table_name = 'pharmacy'
    ) THEN
        ALTER TABLE pharmacy DROP CONSTRAINT pharmacy_status_check;
    END IF;

    -- Add status constraint with all valid values
    ALTER TABLE pharmacy ADD CONSTRAINT pharmacy_status_check
    CHECK (status IN ('pending', 'active', 'suspended', 'blacklisted'));

    -- Drop existing subscription_tier constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'pharmacy_subscription_tier_check'
        AND table_name = 'pharmacy'
    ) THEN
        ALTER TABLE pharmacy DROP CONSTRAINT pharmacy_subscription_tier_check;
    END IF;

    -- Add subscription_tier constraint
    ALTER TABLE pharmacy ADD CONSTRAINT pharmacy_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise'));

    -- Drop existing subscription_status constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'pharmacy_subscription_status_check'
        AND table_name = 'pharmacy'
    ) THEN
        ALTER TABLE pharmacy DROP CONSTRAINT pharmacy_subscription_status_check;
    END IF;

    -- Add subscription_status constraint
    ALTER TABLE pharmacy ADD CONSTRAINT pharmacy_subscription_status_check
    CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled', 'past_due'));

EXCEPTION
    WHEN OTHERS THEN
        -- Log error but continue
        RAISE NOTICE 'Error updating pharmacy schema: %', SQLERRM;
END $$;

-- =====================================================
-- CREATE UPDATED PHARMACY TABLE (REFERENCE ONLY)
-- This shows the complete structure after updates
-- =====================================================
/*
CREATE TABLE IF NOT EXISTS pharmacy (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  pharmacy_name VARCHAR(255) NOT NULL,
  npi_number VARCHAR(50),
  dea_number VARCHAR(50),
  phone VARCHAR(20),
  contact_phone VARCHAR(20),
  physical_address JSONB,
  billing_address JSONB,
  state_license_number VARCHAR(100),
  license_expiry_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'blacklisted')),
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled', 'past_due')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_email ON pharmacy(email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_status ON pharmacy(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_created_at ON pharmacy(created_at);

-- Comments
COMMENT ON TABLE pharmacy IS 'Pharmacy profiles and business information';
COMMENT ON COLUMN pharmacy.physical_address IS 'Physical address stored as {street, city, state, zip}';
COMMENT ON COLUMN pharmacy.billing_address IS 'Billing address stored as {street, city, state, zip}';
COMMENT ON COLUMN pharmacy.state_license_number IS 'State pharmacy license number (e.g., NY-12345, CA-67890)';
COMMENT ON COLUMN pharmacy.license_expiry_date IS 'Expiration date of the pharmacy license';
*/

