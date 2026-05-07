-- ============================================================
-- Add minimum buy quantity to marketplace_deals
-- ============================================================

-- Add column for minimum buy quantity
ALTER TABLE public.marketplace_deals 
ADD COLUMN IF NOT EXISTS minimum_buy_quantity INTEGER DEFAULT 1;

-- Add constraint: minimum_buy_quantity must be at least 1
ALTER TABLE public.marketplace_deals 
ADD CONSTRAINT chk_minimum_buy_quantity_positive 
CHECK (minimum_buy_quantity >= 1);

-- Add constraint: minimum_buy_quantity cannot exceed quantity
-- Note: This is enforced at the RPC level since quantity changes

-- Update existing deals to have minimum_buy_quantity = 1 if null
UPDATE public.marketplace_deals 
SET minimum_buy_quantity = 1 
WHERE minimum_buy_quantity IS NULL;

-- Comment
COMMENT ON COLUMN public.marketplace_deals.minimum_buy_quantity IS 'Minimum quantity a pharmacy must buy for this deal. Default is 1.';

