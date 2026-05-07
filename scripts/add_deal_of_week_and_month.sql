-- ============================================================
-- Add Deal of the Week and Deal of the Month to marketplace_deals
-- Similar to Deal of the Day functionality
-- ============================================================

-- Add columns for Deal of the Week
ALTER TABLE public.marketplace_deals 
ADD COLUMN IF NOT EXISTS is_deal_of_the_week BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deal_of_the_week_until TIMESTAMP WITH TIME ZONE NULL;

-- Add columns for Deal of the Month
ALTER TABLE public.marketplace_deals 
ADD COLUMN IF NOT EXISTS is_deal_of_the_month BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deal_of_the_month_until TIMESTAMP WITH TIME ZONE NULL;

-- Add index for quick lookup - Deal of the Week
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_deal_of_week 
ON public.marketplace_deals(is_deal_of_the_week) 
WHERE is_deal_of_the_week = TRUE;

-- Add index for quick lookup - Deal of the Month
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_deal_of_month 
ON public.marketplace_deals(is_deal_of_the_month) 
WHERE is_deal_of_the_month = TRUE;

-- Add constraint: Only one deal can be deal of the week at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_deals_single_deal_of_week
ON public.marketplace_deals(id)
WHERE is_deal_of_the_week = TRUE;

-- Add constraint: Only one deal can be deal of the month at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_deals_single_deal_of_month
ON public.marketplace_deals(id)
WHERE is_deal_of_the_month = TRUE;

-- Comments
COMMENT ON COLUMN public.marketplace_deals.is_deal_of_the_week IS 'Whether this deal is manually set as Deal of the Week';
COMMENT ON COLUMN public.marketplace_deals.deal_of_the_week_until IS 'Optional expiration timestamp for Deal of the Week. If NULL, stays until manually changed.';
COMMENT ON COLUMN public.marketplace_deals.is_deal_of_the_month IS 'Whether this deal is manually set as Deal of the Month';
COMMENT ON COLUMN public.marketplace_deals.deal_of_the_month_until IS 'Optional expiration timestamp for Deal of the Month. If NULL, stays until manually changed.';

