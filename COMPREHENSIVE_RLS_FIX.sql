-- ================================================================
-- COMPREHENSIVE RLS POLICY FIX
-- ================================================================
-- 
-- ISSUE: Multiple tables have RLS policies that don't specify roles,
-- causing "Failed to count/access" errors throughout the application.
-- 
-- All policies created with pattern:
-- CREATE POLICY "Allow all access via service role" ON table_name 
-- USING (true) WITH CHECK (true);
--
-- Are missing the critical "TO service_role" clause, which means
-- they don't actually grant access to the service role.
--
-- ================================================================

-- Fix processors table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processors;
CREATE POLICY "service_role_all_processors" ON public.processors
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processors TO service_role;

-- Fix processor_store_assignments table  
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processor_store_assignments;
CREATE POLICY "service_role_all_processor_assignments" ON public.processor_store_assignments
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processor_store_assignments TO service_role;

-- Fix return_transactions table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transactions;
CREATE POLICY "service_role_all_return_transactions" ON public.return_transactions
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_transactions TO service_role;

-- Fix refresh_tokens table (if not already fixed)
DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public.refresh_tokens;
CREATE POLICY "service_role_all_refresh_tokens" ON public.refresh_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.refresh_tokens TO service_role;

-- Fix other tables that might have the same issue
-- (Add more as needed based on error logs)

-- Fix ra_requests table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ra_requests;
CREATE POLICY "service_role_all_ra_requests" ON public.ra_requests
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ra_requests TO service_role;

-- Fix return_batches table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_batches;
CREATE POLICY "service_role_all_return_batches" ON public.return_batches
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_batches TO service_role;

-- Fix pharmacy_payments table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.pharmacy_payments;
CREATE POLICY "service_role_all_pharmacy_payments" ON public.pharmacy_payments
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pharmacy_payments TO service_role;

-- Fix non_returnable_products table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.non_returnable_products;
CREATE POLICY "service_role_all_non_returnable_products" ON public.non_returnable_products
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.non_returnable_products TO service_role;

-- Fix ndc_pricing table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_pricing;
CREATE POLICY "service_role_all_ndc_pricing" ON public.ndc_pricing
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_pricing TO service_role;

-- Fix ndc_price_history table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_price_history;
CREATE POLICY "service_role_all_ndc_price_history" ON public.ndc_price_history
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_price_history TO service_role;

-- Fix manufacturer_return_policies table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_return_policies;
CREATE POLICY "service_role_all_manufacturer_return_policies" ON public.manufacturer_return_policies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_return_policies TO service_role;

-- Fix manufacturer_policy_notes table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policy_notes;
CREATE POLICY "service_role_all_manufacturer_policy_notes" ON public.manufacturer_policy_notes
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_policy_notes TO service_role;

-- Fix manufacturer_policies table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policies;
CREATE POLICY "service_role_all_manufacturer_policies" ON public.manufacturer_policies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_policies TO service_role;

-- Fix debit_memos table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memos;
CREATE POLICY "service_role_all_debit_memos" ON public.debit_memos
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.debit_memos TO service_role;

-- Fix debit_memo_items table
DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memo_items;
CREATE POLICY "service_role_all_debit_memo_items" ON public.debit_memo_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.debit_memo_items TO service_role;

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================
-- Run this after applying the fix to verify policies are correct:
--
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND policyname LIKE '%service_role%'
-- ORDER BY tablename, policyname;
--
-- ================================================================
-- HOW TO APPLY THIS FIX:
-- ================================================================
--
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- 5. Restart your backend server to clear any connection caches
--
-- ================================================================