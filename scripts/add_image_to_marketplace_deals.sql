-- Add image column to marketplace_deals table
-- This stores the URL of the product image uploaded to Supabase Storage

ALTER TABLE public.marketplace_deals 
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- Add index for image URL lookups (optional, but can be useful)
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_image ON public.marketplace_deals(image_url) 
WHERE image_url IS NOT NULL;

-- Comment
COMMENT ON COLUMN public.marketplace_deals.image_url IS 'URL of the product image stored in Supabase Storage';
