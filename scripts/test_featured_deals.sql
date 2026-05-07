-- ============================================================
-- TEST FEATURED DEALS FUNCTIONS
-- Run this in Supabase SQL Editor to test the functions
-- ============================================================

-- Test 1: Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('unset_featured_deal', 'get_featured_deal', 'set_featured_deal', 'get_all_featured_deals_info')
ORDER BY routine_name;

-- Test 2: Check current featured deals in database
SELECT 
  id,
  product_name,
  is_deal_of_the_day,
  deal_of_the_day_until,
  is_deal_of_the_week,
  deal_of_the_week_until,
  is_deal_of_the_month,
  deal_of_the_month_until
FROM marketplace_deals 
WHERE is_deal_of_the_day = TRUE 
   OR is_deal_of_the_week = TRUE 
   OR is_deal_of_the_month = TRUE;

-- Test 3: Try to unset deal of the week manually
UPDATE marketplace_deals 
SET is_deal_of_the_week = FALSE,
    deal_of_the_week_until = NULL,
    updated_at = NOW()
WHERE is_deal_of_the_week = TRUE;

-- Test 4: Check if any deals are still marked as featured
SELECT 
  COUNT(*) as total_featured_deals,
  COUNT(CASE WHEN is_deal_of_the_day = TRUE THEN 1 END) as day_deals,
  COUNT(CASE WHEN is_deal_of_the_week = TRUE THEN 1 END) as week_deals,
  COUNT(CASE WHEN is_deal_of_the_month = TRUE THEN 1 END) as month_deals
FROM marketplace_deals;
