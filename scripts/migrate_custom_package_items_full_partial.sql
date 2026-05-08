-- Migration: Add full and partial columns to custom_package_items table
-- This replaces the quantity column with separate full and partial unit columns
-- Note: "full" is a reserved keyword in PostgreSQL, so we use quoted identifiers

-- Step 1: Add new columns (using quoted identifiers for reserved keyword "full")
ALTER TABLE public.custom_package_items
ADD COLUMN IF NOT EXISTS "full" integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "partial" integer NOT NULL DEFAULT 0;

-- Step 2: Migrate existing data from quantity to full (assuming old quantity was full units)
-- If quantity exists and has data, copy it to full
UPDATE public.custom_package_items
SET "full" = COALESCE(quantity, 0)
WHERE quantity IS NOT NULL AND quantity > 0;

-- Step 3: Drop the old quantity column (optional - can be done after verifying migration)
-- Uncomment the following line to drop the quantity column after verifying data migration
-- ALTER TABLE public.custom_package_items DROP COLUMN IF EXISTS quantity;

-- Verify the changes
-- SELECT id, ndc, "full", "partial", quantity FROM public.custom_package_items LIMIT 10;
