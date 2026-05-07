-- ============================================================
-- CHECK DATABASE SCHEMA
-- Run this in Supabase SQL Editor to verify the schema
-- ============================================================

-- Check if the new columns exist in marketplace_deals table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'marketplace_deals' 
  AND table_schema = 'public'
  AND column_name IN (
    'is_deal_of_the_week', 
    'deal_of_the_week_until', 
    'is_deal_of_the_month', 
    'deal_of_the_month_until'
  )
ORDER BY column_name;

-- Check if the indexes exist
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'marketplace_deals' 
  AND (indexname LIKE '%deal_of_week%' OR indexname LIKE '%deal_of_month%')
ORDER BY indexname;
