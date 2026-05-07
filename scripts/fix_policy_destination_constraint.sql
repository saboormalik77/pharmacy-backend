-- FIX: Remove hardcoded CHECK constraint on manufacturer_return_policies.destination
--
-- Before: destination TEXT CHECK (destination IN ('inmar', 'qualanex', 'pharmalink', 'other'))
-- After:  destination TEXT NOT NULL  (any reverse-distributor name accepted)
--
-- Background: Destinations are now loaded dynamically from the reverse_distributors table,
-- so locking the column to 4 hardcoded values breaks the new dynamic dropdown.
--
-- Run ONCE in Supabase SQL Editor.
-- ============================================================

-- Drop the old CHECK constraint (name varies by Postgres version; try both common names)
ALTER TABLE manufacturer_return_policies
  DROP CONSTRAINT IF EXISTS manufacturer_return_policies_destination_check;

-- Verify the column stays NOT NULL with no check
ALTER TABLE manufacturer_return_policies
  ALTER COLUMN destination SET NOT NULL;
