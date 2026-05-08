-- Migration: Add fee-related columns to custom_packages table
-- Run this in Supabase SQL Editor

-- Add fee-related columns if they don't exist
ALTER TABLE public.custom_packages ADD COLUMN IF NOT EXISTS fee_rate numeric(5, 2) null;
ALTER TABLE public.custom_packages ADD COLUMN IF NOT EXISTS fee_amount numeric(10, 2) null;
ALTER TABLE public.custom_packages ADD COLUMN IF NOT EXISTS net_estimated_value numeric(10, 2) null;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'custom_packages' 
AND column_name IN ('fee_rate', 'fee_amount', 'net_estimated_value')
ORDER BY column_name;
