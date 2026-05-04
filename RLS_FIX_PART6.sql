-- ================================================================
-- RLS FIX PART 6: Admin, Warehouse & Misc Tables
-- ================================================================

-- 1. main_admin
DROP POLICY IF EXISTS "service_role_all_main_admin" ON public.main_admin;
CREATE POLICY "service_role_all_main_admin" ON public.main_admin
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.main_admin TO service_role;

-- 2. sub_main_admin
DROP POLICY IF EXISTS "service_role_all_sub_main_admin" ON public.sub_main_admin;
CREATE POLICY "service_role_all_sub_main_admin" ON public.sub_main_admin
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.sub_main_admin TO service_role;

-- 3. admin_recent_activity
DROP POLICY IF EXISTS "service_role_all_admin_recent_activity" ON public.admin_recent_activity;
CREATE POLICY "service_role_all_admin_recent_activity" ON public.admin_recent_activity
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.admin_recent_activity TO service_role;

-- 4. buying_group_domains
DROP POLICY IF EXISTS "Service role full access" ON public.buying_group_domains;
CREATE POLICY "service_role_all_buying_group_domains" ON public.buying_group_domains
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.buying_group_domains TO service_role;

-- 5. email_logs
DROP POLICY IF EXISTS "policy" ON public.email_logs;
CREATE POLICY "service_role_all_email_logs" ON public.email_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.email_logs TO service_role;

-- 6. warehouse_discrepancies
DROP POLICY IF EXISTS "Allow all access via service role" ON public.warehouse_discrepancies;
CREATE POLICY "service_role_all_warehouse_discrepancies" ON public.warehouse_discrepancies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.warehouse_discrepancies TO service_role;

-- 7. warehouse_surplus_items
DROP POLICY IF EXISTS "Allow all access via service role on surplus" ON public.warehouse_surplus_items;
CREATE POLICY "service_role_all_warehouse_surplus_items" ON public.warehouse_surplus_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.warehouse_surplus_items TO service_role;

-- 8. wine_cellar
DROP POLICY IF EXISTS "Allow all access via service role" ON public.wine_cellar;
CREATE POLICY "service_role_all_wine_cellar" ON public.wine_cellar
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.wine_cellar TO service_role;

-- 9. subscription_plans
DROP POLICY IF EXISTS "service_role_all_subscription_plans" ON public.subscription_plans;
CREATE POLICY "service_role_all_subscription_plans" ON public.subscription_plans
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.subscription_plans TO service_role;

-- 10. subscriptions
DROP POLICY IF EXISTS "service_role_all_subscriptions" ON public.subscriptions;
CREATE POLICY "service_role_all_subscriptions" ON public.subscriptions
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.subscriptions TO service_role;