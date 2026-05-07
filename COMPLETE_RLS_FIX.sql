-- ================================================================
-- COMPLETE RLS POLICY FIX - Based on Backend Code Analysis
-- ================================================================
-- 
-- This script fixes ALL tables that:
-- 1. Have RLS enabled but policies missing the "TO service_role" clause
-- 2. Have RLS enabled but no policies at all
-- 
-- Generated from analysis of:
-- - All services in src/services/*.ts
-- - Database dump public_schema_only_20260430_201400.sql
--
-- ================================================================

-- ================================================================
-- SECTION 1: Tables with broken policies (missing TO service_role)
-- These tables have "USING (true) WITH CHECK (true)" but no role specified
-- ================================================================

-- 1. batch_workflow_steps
DROP POLICY IF EXISTS "Allow all access via service role" ON public.batch_workflow_steps;
CREATE POLICY "service_role_all_batch_workflow_steps" ON public.batch_workflow_steps
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.batch_workflow_steps TO service_role;

-- 2. debit_memo_items
DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memo_items;
CREATE POLICY "service_role_all_debit_memo_items" ON public.debit_memo_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.debit_memo_items TO service_role;

-- 3. debit_memos
DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memos;
CREATE POLICY "service_role_all_debit_memos" ON public.debit_memos
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.debit_memos TO service_role;

-- 4. manufacturer_policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policies;
CREATE POLICY "service_role_all_manufacturer_policies" ON public.manufacturer_policies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_policies TO service_role;

-- 5. manufacturer_policy_notes
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policy_notes;
CREATE POLICY "service_role_all_manufacturer_policy_notes" ON public.manufacturer_policy_notes
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_policy_notes TO service_role;

-- 6. manufacturer_return_policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_return_policies;
CREATE POLICY "service_role_all_manufacturer_return_policies" ON public.manufacturer_return_policies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_return_policies TO service_role;

-- 7. ndc_price_history
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_price_history;
CREATE POLICY "service_role_all_ndc_price_history" ON public.ndc_price_history
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_price_history TO service_role;

-- 8. ndc_pricing
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_pricing;
CREATE POLICY "service_role_all_ndc_pricing" ON public.ndc_pricing
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_pricing TO service_role;

-- 9. non_returnable_products
DROP POLICY IF EXISTS "Allow all access via service role" ON public.non_returnable_products;
CREATE POLICY "service_role_all_non_returnable_products" ON public.non_returnable_products
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.non_returnable_products TO service_role;

-- 10. pharmacy_payments
DROP POLICY IF EXISTS "Allow all access via service role" ON public.pharmacy_payments;
CREATE POLICY "service_role_all_pharmacy_payments" ON public.pharmacy_payments
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pharmacy_payments TO service_role;

-- 11. processor_store_assignments
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processor_store_assignments;
CREATE POLICY "service_role_all_processor_store_assignments" ON public.processor_store_assignments
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processor_store_assignments TO service_role;

-- 12. processors
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processors;
CREATE POLICY "service_role_all_processors" ON public.processors
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processors TO service_role;

-- 13. ra_requests (if exists - may not exist in your DB)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ra_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.ra_requests';
    EXECUTE 'CREATE POLICY "service_role_all_ra_requests" ON public.ra_requests FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.ra_requests TO service_role';
  END IF;
END $$;

-- 14. return_batches
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_batches;
CREATE POLICY "service_role_all_return_batches" ON public.return_batches
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_batches TO service_role;

-- 15. return_transaction_items
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transaction_items;
CREATE POLICY "service_role_all_return_transaction_items" ON public.return_transaction_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_transaction_items TO service_role;

-- 16. return_transactions
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transactions;
CREATE POLICY "service_role_all_return_transactions" ON public.return_transactions
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_transactions TO service_role;

-- 17. shipment_groups
DROP POLICY IF EXISTS "Allow all access via service role" ON public.shipment_groups;
CREATE POLICY "service_role_all_shipment_groups" ON public.shipment_groups
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.shipment_groups TO service_role;

-- 18. warehouse_discrepancies
DROP POLICY IF EXISTS "Allow all access via service role" ON public.warehouse_discrepancies;
CREATE POLICY "service_role_all_warehouse_discrepancies" ON public.warehouse_discrepancies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.warehouse_discrepancies TO service_role;

-- 19. wine_cellar
DROP POLICY IF EXISTS "Allow all access via service role" ON public.wine_cellar;
CREATE POLICY "service_role_all_wine_cellar" ON public.wine_cellar
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.wine_cellar TO service_role;

-- 20. warehouse_surplus_items
DROP POLICY IF EXISTS "Allow all access via service role on surplus" ON public.warehouse_surplus_items;
CREATE POLICY "service_role_all_warehouse_surplus_items" ON public.warehouse_surplus_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.warehouse_surplus_items TO service_role;

-- 21. custom_package_items (has "Custom Policy" without role)
DROP POLICY IF EXISTS "Custom Policy" ON public.custom_package_items;
CREATE POLICY "service_role_all_custom_package_items" ON public.custom_package_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.custom_package_items TO service_role;

-- 22. ndc_packages (has "Custom Policy" without role)
DROP POLICY IF EXISTS "Custom Policy" ON public.ndc_packages;
CREATE POLICY "service_role_all_ndc_packages" ON public.ndc_packages
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_packages TO service_role;

-- 23. ndc_products (has "Custom Policy" without role)
DROP POLICY IF EXISTS "Custom Policy" ON public.ndc_products;
CREATE POLICY "service_role_all_ndc_products" ON public.ndc_products
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_products TO service_role;

-- 24. product_list_items (has "Custom Policy" without role)
DROP POLICY IF EXISTS "Custom Policy" ON public.product_list_items;
CREATE POLICY "service_role_all_product_list_items" ON public.product_list_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.product_list_items TO service_role;

-- 25. return_reports (has "Custom Policy" without role)
DROP POLICY IF EXISTS "Custom Policy" ON public.return_reports;
CREATE POLICY "service_role_all_return_reports" ON public.return_reports
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_reports TO service_role;

-- 26. custom_packages (has "Policy" without role)
DROP POLICY IF EXISTS "Policy" ON public.custom_packages;
CREATE POLICY "service_role_all_custom_packages" ON public.custom_packages
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.custom_packages TO service_role;

-- 27. buying_group_domains (has policy without role)
DROP POLICY IF EXISTS "Service role full access" ON public.buying_group_domains;
CREATE POLICY "service_role_all_buying_group_domains" ON public.buying_group_domains
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.buying_group_domains TO service_role;

-- 28. admin (has "policy" without role)
DROP POLICY IF EXISTS "policy" ON public.admin;
CREATE POLICY "service_role_all_admin" ON public.admin
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.admin TO service_role;

-- 29. email_logs (has "policy" without role)
DROP POLICY IF EXISTS "policy" ON public.email_logs;
CREATE POLICY "service_role_all_email_logs" ON public.email_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.email_logs TO service_role;

-- ================================================================
-- SECTION 2: Tables with RLS but NO policies at all
-- These tables need service_role policies created from scratch
-- ================================================================

-- 30. refresh_tokens
DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public.refresh_tokens;
CREATE POLICY "service_role_all_refresh_tokens" ON public.refresh_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.refresh_tokens TO service_role;

-- 31. reverse_distributors
DROP POLICY IF EXISTS "service_role_all_reverse_distributors" ON public.reverse_distributors;
CREATE POLICY "service_role_all_reverse_distributors" ON public.reverse_distributors
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.reverse_distributors TO service_role;

-- 32. uploaded_documents
DROP POLICY IF EXISTS "service_role_all_uploaded_documents" ON public.uploaded_documents;
CREATE POLICY "service_role_all_uploaded_documents" ON public.uploaded_documents
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.uploaded_documents TO service_role;

-- 33. products
DROP POLICY IF EXISTS "service_role_all_products" ON public.products;
CREATE POLICY "service_role_all_products" ON public.products
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.products TO service_role;

-- 34. sub_main_admin
DROP POLICY IF EXISTS "service_role_all_sub_main_admin" ON public.sub_main_admin;
CREATE POLICY "service_role_all_sub_main_admin" ON public.sub_main_admin
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.sub_main_admin TO service_role;

-- 35. main_admin
DROP POLICY IF EXISTS "service_role_all_main_admin" ON public.main_admin;
CREATE POLICY "service_role_all_main_admin" ON public.main_admin
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.main_admin TO service_role;

-- 36. subscription_plans
DROP POLICY IF EXISTS "service_role_all_subscription_plans" ON public.subscription_plans;
CREATE POLICY "service_role_all_subscription_plans" ON public.subscription_plans
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.subscription_plans TO service_role;

-- 37. subscriptions
DROP POLICY IF EXISTS "service_role_all_subscriptions" ON public.subscriptions;
CREATE POLICY "service_role_all_subscriptions" ON public.subscriptions
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.subscriptions TO service_role;

-- 38. ndc_pricing_index
DROP POLICY IF EXISTS "service_role_all_ndc_pricing_index" ON public.ndc_pricing_index;
CREATE POLICY "service_role_all_ndc_pricing_index" ON public.ndc_pricing_index
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_pricing_index TO service_role;

-- ================================================================
-- SECTION 3: Add additional policy for admin_recent_activity 
-- (has partial policies but needs full service_role access)
-- ================================================================

DROP POLICY IF EXISTS "service_role_all_admin_recent_activity" ON public.admin_recent_activity;
CREATE POLICY "service_role_all_admin_recent_activity" ON public.admin_recent_activity
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.admin_recent_activity TO service_role;

-- ================================================================
-- SECTION 4: Tables that may exist in code but not in DB
-- Using DO blocks to safely handle non-existent tables
-- ================================================================

-- returns table (used in returnsService.ts)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'returns') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_returns" ON public.returns';
    EXECUTE 'CREATE POLICY "service_role_all_returns" ON public.returns FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.returns TO service_role';
  END IF;
END $$;

-- return_items table (used in returnsService.ts)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_return_items" ON public.return_items';
    EXECUTE 'CREATE POLICY "service_role_all_return_items" ON public.return_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.return_items TO service_role';
  END IF;
END $$;

-- inventory_items table (used in inventoryService.ts)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_inventory_items" ON public.inventory_items';
    EXECUTE 'CREATE POLICY "service_role_all_inventory_items" ON public.inventory_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.inventory_items TO service_role';
  END IF;
END $$;

-- service_requests table (used in serviceRequestService.ts)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_service_requests" ON public.service_requests';
    EXECUTE 'CREATE POLICY "service_role_all_service_requests" ON public.service_requests FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.service_requests TO service_role';
  END IF;
END $$;

-- service_request_assignments table (used in serviceRequestService.ts)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_request_assignments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_service_request_assignments" ON public.service_request_assignments';
    EXECUTE 'CREATE POLICY "service_role_all_service_request_assignments" ON public.service_request_assignments FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.service_request_assignments TO service_role';
  END IF;
END $$;

-- admin_users table (used in jobSheetService.ts)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_admin_users" ON public.admin_users';
    EXECUTE 'CREATE POLICY "service_role_all_admin_users" ON public.admin_users FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.admin_users TO service_role';
  END IF;
END $$;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these after applying the fix to verify policies are correct:
--
-- Check all service_role policies:
-- SELECT tablename, policyname, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND roles @> ARRAY['service_role']
-- ORDER BY tablename;
--
-- Check tables with RLS but missing service_role policies:
-- SELECT t.tablename
-- FROM pg_tables t
-- WHERE t.schemaname = 'public'
--   AND t.rowsecurity = true
--   AND NOT EXISTS (
--     SELECT 1 FROM pg_policies p 
--     WHERE p.tablename = t.tablename 
--       AND p.schemaname = 'public'
--       AND p.roles @> ARRAY['service_role']
--   );
--
-- ================================================================