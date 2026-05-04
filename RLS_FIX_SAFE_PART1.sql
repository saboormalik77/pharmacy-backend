-- ================================================================
-- RLS FIX PART 1 (SAFE): Core Tables - Checks if table exists first
-- ================================================================

-- processors
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'processors') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.processors';
    EXECUTE 'CREATE POLICY "service_role_all_processors" ON public.processors FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.processors TO service_role';
    RAISE NOTICE 'Fixed: processors';
  ELSE
    RAISE NOTICE 'Skipped: processors (table does not exist)';
  END IF;
END $$;

-- processor_store_assignments
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'processor_store_assignments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.processor_store_assignments';
    EXECUTE 'CREATE POLICY "service_role_all_processor_store_assignments" ON public.processor_store_assignments FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.processor_store_assignments TO service_role';
    RAISE NOTICE 'Fixed: processor_store_assignments';
  ELSE
    RAISE NOTICE 'Skipped: processor_store_assignments (table does not exist)';
  END IF;
END $$;

-- return_transactions
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_transactions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transactions';
    EXECUTE 'CREATE POLICY "service_role_all_return_transactions" ON public.return_transactions FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.return_transactions TO service_role';
    RAISE NOTICE 'Fixed: return_transactions';
  ELSE
    RAISE NOTICE 'Skipped: return_transactions (table does not exist)';
  END IF;
END $$;

-- refresh_tokens
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'refresh_tokens') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public.refresh_tokens';
    EXECUTE 'CREATE POLICY "service_role_all_refresh_tokens" ON public.refresh_tokens FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.refresh_tokens TO service_role';
    RAISE NOTICE 'Fixed: refresh_tokens';
  ELSE
    RAISE NOTICE 'Skipped: refresh_tokens (table does not exist)';
  END IF;
END $$;

-- admin
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin') THEN
    EXECUTE 'DROP POLICY IF EXISTS "policy" ON public.admin';
    EXECUTE 'CREATE POLICY "service_role_all_admin" ON public.admin FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.admin TO service_role';
    RAISE NOTICE 'Fixed: admin';
  ELSE
    RAISE NOTICE 'Skipped: admin (table does not exist)';
  END IF;
END $$;