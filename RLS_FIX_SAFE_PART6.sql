-- ================================================================
-- RLS FIX PART 6 (SAFE): Admin, Warehouse & Misc Tables
-- ================================================================

-- main_admin
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'main_admin') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_main_admin" ON public.main_admin';
    EXECUTE 'CREATE POLICY "service_role_all_main_admin" ON public.main_admin FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.main_admin TO service_role';
    RAISE NOTICE 'Fixed: main_admin';
  ELSE
    RAISE NOTICE 'Skipped: main_admin (table does not exist)';
  END IF;
END $$;

-- sub_main_admin
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sub_main_admin') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_sub_main_admin" ON public.sub_main_admin';
    EXECUTE 'CREATE POLICY "service_role_all_sub_main_admin" ON public.sub_main_admin FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.sub_main_admin TO service_role';
    RAISE NOTICE 'Fixed: sub_main_admin';
  ELSE
    RAISE NOTICE 'Skipped: sub_main_admin (table does not exist)';
  END IF;
END $$;

-- admin_recent_activity
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_recent_activity') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_admin_recent_activity" ON public.admin_recent_activity';
    EXECUTE 'CREATE POLICY "service_role_all_admin_recent_activity" ON public.admin_recent_activity FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.admin_recent_activity TO service_role';
    RAISE NOTICE 'Fixed: admin_recent_activity';
  ELSE
    RAISE NOTICE 'Skipped: admin_recent_activity (table does not exist)';
  END IF;
END $$;

-- buying_group_domains
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'buying_group_domains') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON public.buying_group_domains';
    EXECUTE 'CREATE POLICY "service_role_all_buying_group_domains" ON public.buying_group_domains FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.buying_group_domains TO service_role';
    RAISE NOTICE 'Fixed: buying_group_domains';
  ELSE
    RAISE NOTICE 'Skipped: buying_group_domains (table does not exist)';
  END IF;
END $$;

-- email_logs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "policy" ON public.email_logs';
    EXECUTE 'CREATE POLICY "service_role_all_email_logs" ON public.email_logs FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.email_logs TO service_role';
    RAISE NOTICE 'Fixed: email_logs';
  ELSE
    RAISE NOTICE 'Skipped: email_logs (table does not exist)';
  END IF;
END $$;

-- warehouse_discrepancies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'warehouse_discrepancies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.warehouse_discrepancies';
    EXECUTE 'CREATE POLICY "service_role_all_warehouse_discrepancies" ON public.warehouse_discrepancies FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.warehouse_discrepancies TO service_role';
    RAISE NOTICE 'Fixed: warehouse_discrepancies';
  ELSE
    RAISE NOTICE 'Skipped: warehouse_discrepancies (table does not exist)';
  END IF;
END $$;

-- warehouse_surplus_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'warehouse_surplus_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role on surplus" ON public.warehouse_surplus_items';
    EXECUTE 'CREATE POLICY "service_role_all_warehouse_surplus_items" ON public.warehouse_surplus_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.warehouse_surplus_items TO service_role';
    RAISE NOTICE 'Fixed: warehouse_surplus_items';
  ELSE
    RAISE NOTICE 'Skipped: warehouse_surplus_items (table does not exist)';
  END IF;
END $$;

-- wine_cellar
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wine_cellar') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.wine_cellar';
    EXECUTE 'CREATE POLICY "service_role_all_wine_cellar" ON public.wine_cellar FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.wine_cellar TO service_role';
    RAISE NOTICE 'Fixed: wine_cellar';
  ELSE
    RAISE NOTICE 'Skipped: wine_cellar (table does not exist)';
  END IF;
END $$;

-- subscription_plans
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_plans') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_subscription_plans" ON public.subscription_plans';
    EXECUTE 'CREATE POLICY "service_role_all_subscription_plans" ON public.subscription_plans FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.subscription_plans TO service_role';
    RAISE NOTICE 'Fixed: subscription_plans';
  ELSE
    RAISE NOTICE 'Skipped: subscription_plans (table does not exist)';
  END IF;
END $$;

-- subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_subscriptions" ON public.subscriptions';
    EXECUTE 'CREATE POLICY "service_role_all_subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.subscriptions TO service_role';
    RAISE NOTICE 'Fixed: subscriptions';
  ELSE
    RAISE NOTICE 'Skipped: subscriptions (table does not exist)';
  END IF;
END $$;