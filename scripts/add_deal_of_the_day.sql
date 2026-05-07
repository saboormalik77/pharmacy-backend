-- ============================================================
-- Add Deal of the Day functionality to marketplace_deals
-- ============================================================

-- Add columns for Deal of the Day
ALTER TABLE public.marketplace_deals 
ADD COLUMN IF NOT EXISTS is_deal_of_the_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deal_of_the_day_until TIMESTAMP WITH TIME ZONE NULL;

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_deal_of_day 
ON public.marketplace_deals(is_deal_of_the_day) 
WHERE is_deal_of_the_day = TRUE;

-- Add constraint: Only one deal can be deal of the day at a time
-- This will be enforced by the RPC function, but we add a unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_deals_single_deal_of_day
ON public.marketplace_deals(id)
WHERE is_deal_of_the_day = TRUE;

-- Comments
COMMENT ON COLUMN public.marketplace_deals.is_deal_of_the_day IS 'Whether this deal is manually set as Deal of the Day';
COMMENT ON COLUMN public.marketplace_deals.deal_of_the_day_until IS 'Optional expiration timestamp for Deal of the Day. If NULL, stays until manually changed.';

