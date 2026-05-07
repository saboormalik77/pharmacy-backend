-- Migration script to replace quantity field with full_units and partial_units in product_list_items table
-- Step 1: Delete all existing records from product_list_items table
DELETE FROM public.product_list_items;

-- Step 2: Drop the quantity column if it exists
ALTER TABLE public.product_list_items 
DROP COLUMN IF EXISTS quantity;

-- Step 3: Drop unit_type column if it exists (from previous migration)
ALTER TABLE public.product_list_items 
DROP COLUMN IF EXISTS unit_type;

-- Step 4: Drop the unit_type constraint if it exists
ALTER TABLE public.product_list_items 
DROP CONSTRAINT IF EXISTS product_list_items_unit_type_check;

-- Step 5: Add full_units column (integer, must be >= 0)
ALTER TABLE public.product_list_items 
ADD COLUMN full_units integer NOT NULL DEFAULT 0;

-- Step 6: Add partial_units column (integer, must be >= 0)
ALTER TABLE public.product_list_items 
ADD COLUMN partial_units integer NOT NULL DEFAULT 0;

-- Step 7: Add check constraint to ensure one is 0 and the other is > 0
-- This ensures: (full_units = 0 AND partial_units > 0) OR (full_units > 0 AND partial_units = 0)
ALTER TABLE public.product_list_items 
ADD CONSTRAINT product_list_items_units_check 
CHECK (
  (full_units = 0 AND partial_units > 0) OR 
  (full_units > 0 AND partial_units = 0)
);

-- Step 8: Add constraints to ensure non-negative values
ALTER TABLE public.product_list_items 
ADD CONSTRAINT product_list_items_full_units_check 
CHECK (full_units >= 0);

ALTER TABLE public.product_list_items 
ADD CONSTRAINT product_list_items_partial_units_check 
CHECK (partial_units >= 0);

-- Step 9: Remove the defaults after adding the constraint
ALTER TABLE public.product_list_items 
ALTER COLUMN full_units DROP DEFAULT;

ALTER TABLE public.product_list_items 
ALTER COLUMN partial_units DROP DEFAULT;

