-- Add quantity_returned column to return_transaction_items table
-- This column stores the actual quantity being returned (can be partial)

-- Add the column if it doesn't exist
ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS quantity_returned INTEGER;

-- Set default values for existing records (copy from quantity column)
UPDATE public.return_transaction_items 
SET quantity_returned = quantity 
WHERE quantity_returned IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE public.return_transaction_items 
ALTER COLUMN quantity_returned SET NOT NULL;

-- Add constraint to ensure positive values (skip if already exists)
DO $$
BEGIN
  ALTER TABLE public.return_transaction_items 
  ADD CONSTRAINT check_quantity_returned_positive CHECK (quantity_returned > 0);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.return_transaction_items.quantity_returned 
IS 'Actual quantity being returned (can be partial)';