-- ================================================================
-- FIX: Add all missing columns to return_transaction_items
-- ================================================================
-- 
-- Based on the SQL dump, these columns might be missing from your live DB
-- Adding them safely with IF NOT EXISTS
--
-- ================================================================

-- Add missing columns one by one
ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS actual_quantity integer;

ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS condition_notes text;

ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS estimated_store_price numeric(12,2);

ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS estimated_store_value numeric(12,2);

ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS full_package_qty_returned integer;

ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS quantity_returned integer;

ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS verification_status text;

-- Add constraint for verification_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'return_transaction_items_verification_status_check'
      AND constraint_schema = 'public'
  ) THEN
    ALTER TABLE public.return_transaction_items
    ADD CONSTRAINT return_transaction_items_verification_status_check 
    CHECK (verification_status IS NULL OR verification_status = ANY (ARRAY['correct'::text, 'damaged'::text, 'missing'::text, 'wrong_item'::text]));
    RAISE NOTICE '✅ Added verification_status constraint';
  ELSE
    RAISE NOTICE 'ℹ️ verification_status constraint already exists';
  END IF;
END $$;

-- Add comments to match schema
COMMENT ON COLUMN public.return_transaction_items.quantity_returned IS 'Actual quantity being returned (can be partial)';
COMMENT ON COLUMN public.return_transaction_items.verified IS 'Whether the item has been verified by warehouse staff';
COMMENT ON COLUMN public.return_transaction_items.actual_quantity IS 'Actual quantity found during verification';
COMMENT ON COLUMN public.return_transaction_items.condition_notes IS 'Notes about the condition of the item during verification';
COMMENT ON COLUMN public.return_transaction_items.estimated_store_price IS 'Estimated price the pharmacy paid for this item';
COMMENT ON COLUMN public.return_transaction_items.estimated_store_value IS 'Estimated total value (store price * quantity)';
COMMENT ON COLUMN public.return_transaction_items.full_package_qty_returned IS 'Number of full packages being returned';
COMMENT ON COLUMN public.return_transaction_items.verification_status IS 'Status after warehouse verification (correct, damaged, missing, wrong_item)';

-- Verify all columns were added
DO $$
DECLARE
  missing_columns text[] := ARRAY[]::text[];
  col_name text;
BEGIN
  -- Check for each required column
  FOR col_name IN SELECT unnest(ARRAY[
    'verified', 'actual_quantity', 'condition_notes', 
    'estimated_store_price', 'estimated_store_value', 
    'full_package_qty_returned', 'quantity_returned', 'verification_status'
  ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'return_transaction_items' 
        AND column_name = col_name
    ) THEN
      missing_columns := missing_columns || col_name;
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE '❌ Still missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All required columns exist in return_transaction_items';
  END IF;
END $$;