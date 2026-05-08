-- ============================================================
-- FCR Module 1 — Task 1.1: Extend pharmacy table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Store number: unique 4-digit identifier used in license plates and payments
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS store_number VARCHAR(10) UNIQUE;

-- Wholesaler info: required for downstream manufacturer processing
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS primary_wholesaler TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS wholesaler_account_number TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS secondary_wholesaler TEXT;

-- GPO / white-label grouping
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS gpo_affiliation TEXT;

-- Service type determines the return workflow path
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'full_service'
  CHECK (service_type IN ('full_service', 'self_service', 'express'));

-- Processor and sales rep assignment (FK added after processors table exists)
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS assigned_processor_id UUID;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS assigned_sales_person_id UUID;

-- Visit scheduling: processors visit pharmacies on a cycle (default 120 days)
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS next_visit_date DATE;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS days_between_visits INTEGER DEFAULT 120;

-- DEA expiration tracking (DEA number already exists)
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS dea_expiration_date DATE;

-- Fax number (used in legacy workflow)
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS fax_number TEXT;

-- Index for store_number lookups (used in license plate generation)
CREATE INDEX IF NOT EXISTS idx_pharmacy_store_number ON pharmacy(store_number);

-- Index for processor assignment lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_assigned_processor ON pharmacy(assigned_processor_id);
