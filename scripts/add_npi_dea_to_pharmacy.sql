-- Migration script to add npi_number and dea_number columns to pharmacy table
-- Run this script in your Supabase SQL Editor

-- Step 1: Add npi_number column if it doesn't exist
ALTER TABLE public.pharmacy 
ADD COLUMN IF NOT EXISTS npi_number character varying(50) null;

-- Step 2: Add dea_number column if it doesn't exist
ALTER TABLE public.pharmacy 
ADD COLUMN IF NOT EXISTS dea_number character varying(50) null;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN public.pharmacy.npi_number IS 'National Provider Identifier (NPI) number';
COMMENT ON COLUMN public.pharmacy.dea_number IS 'Drug Enforcement Administration (DEA) number';


