-- Migration Script: Change custom_packages.status from VARCHAR to BOOLEAN
-- Run this script in your Supabase SQL Editor
-- 
-- This migration:
-- 1. Removes the CHECK constraint on status
-- 2. Converts existing 'draft' values to false, and other values to true
-- 3. Changes the column type to BOOLEAN
-- 4. Sets default value to false

BEGIN;

-- Step 1: Remove the CHECK constraint
ALTER TABLE custom_packages 
DROP CONSTRAINT IF EXISTS custom_packages_status_check;

-- Step 2: Add a temporary column for the boolean status
ALTER TABLE custom_packages 
ADD COLUMN status_temp BOOLEAN;

-- Step 3: Convert existing status values to boolean
-- 'draft' -> false, everything else -> true
UPDATE custom_packages 
SET status_temp = CASE 
  WHEN status = 'draft' THEN false 
  ELSE true 
END;

-- Step 4: Drop the old status column
ALTER TABLE custom_packages 
DROP COLUMN status;

-- Step 5: Rename the temporary column to status
ALTER TABLE custom_packages 
RENAME COLUMN status_temp TO status;

-- Step 6: Set NOT NULL constraint and default value
ALTER TABLE custom_packages 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT false;

-- Step 7: Recreate the index (it should still exist, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_custom_packages_status ON custom_packages(status);

COMMIT;

-- Verify the migration
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'custom_packages' AND column_name = 'status';

