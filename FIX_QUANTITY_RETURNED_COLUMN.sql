-- ================================================================
-- FIX: Add missing quantity_returned column
-- ================================================================
-- 
-- The column exists in the SQL dump but is missing from your live database
-- This causes the add_return_transaction_item function to fail
--
-- ================================================================

-- Add the missing column to return_transaction_items
ALTER TABLE public.return_transaction_items 
ADD COLUMN IF NOT EXISTS quantity_returned integer;

-- Add comment to match the schema
COMMENT ON COLUMN public.return_transaction_items.quantity_returned IS 'Actual quantity being returned (can be partial)';

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'return_transaction_items' 
      AND column_name = 'quantity_returned'
  ) THEN
    RAISE NOTICE '✅ Column quantity_returned exists in return_transaction_items';
  ELSE
    RAISE NOTICE '❌ Column quantity_returned still missing from return_transaction_items';
  END IF;
END $$;