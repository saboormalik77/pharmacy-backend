-- ============================================================
-- Add original_quantity column to marketplace_deals
-- This tracks the initial quantity before any sales
-- ============================================================

-- Add original_quantity column (default to current quantity)
ALTER TABLE public.marketplace_deals 
ADD COLUMN IF NOT EXISTS original_quantity INTEGER;

-- Update existing records to set original_quantity = quantity + sold quantity
-- For existing deals, we calculate from order items
UPDATE public.marketplace_deals d
SET original_quantity = d.quantity + COALESCE(
  (SELECT SUM(oi.quantity) 
   FROM marketplace_order_items oi 
   JOIN marketplace_orders o ON o.id = oi.order_id
   WHERE oi.deal_id = d.id 
   AND o.status IN ('paid', 'confirmed', 'shipped', 'delivered')
  ), 0
);

-- For any remaining NULL (deals without orders), set to current quantity
UPDATE public.marketplace_deals
SET original_quantity = quantity
WHERE original_quantity IS NULL;

-- Make it NOT NULL now
ALTER TABLE public.marketplace_deals 
ALTER COLUMN original_quantity SET NOT NULL;

-- Add check constraint
ALTER TABLE public.marketplace_deals 
ADD CONSTRAINT chk_original_quantity CHECK (original_quantity > 0);

-- Add image_url column if not exists
ALTER TABLE public.marketplace_deals 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.marketplace_deals.original_quantity IS 'Initial quantity when deal was created (before any sales)';

