-- ============================================================
-- RESOLVE FUNCTION CONFLICTS
-- Run this script in Supabase SQL Editor to resolve function conflicts
-- ============================================================

-- Drop all existing versions of create_marketplace_deal function
DROP FUNCTION IF EXISTS create_marketplace_deal(TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_marketplace_deal(TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, UUID, TEXT, TEXT, UUID, INTEGER);

-- Drop all existing versions of update_marketplace_deal function  
DROP FUNCTION IF EXISTS update_marketplace_deal(UUID, TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_marketplace_deal(UUID, TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, INTEGER);

-- Now run the admin_marketplace_functions.sql script to recreate the functions with the correct signature
