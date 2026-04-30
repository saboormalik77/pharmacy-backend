-- ================================================================
-- SAFE RLS POLICY FIX - Only Core Tables
-- ================================================================
-- 
-- This version only fixes the essential tables that are confirmed to exist
-- and are causing immediate errors in your application.
--
-- ================================================================

-- Fix processors table (causing the current error)
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processors;
CREATE POLICY "service_role_all_processors" ON public.processors
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processors TO service_role;

-- Fix processor_store_assignments table (used by processors service)
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processor_store_assignments;
CREATE POLICY "service_role_all_processor_assignments" ON public.processor_store_assignments
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processor_store_assignments TO service_role;

-- Fix return_transactions table (used by processors service for counts)
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transactions;
CREATE POLICY "service_role_all_return_transactions" ON public.return_transactions
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_transactions TO service_role;

-- Fix refresh_tokens table (signin issue)
DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public.refresh_tokens;
CREATE POLICY "service_role_all_refresh_tokens" ON public.refresh_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.refresh_tokens TO service_role;

-- Fix admin_settings table (logo upload issue)
DROP POLICY IF EXISTS "service_role_all_admin_settings" ON public.admin_settings;
CREATE POLICY "service_role_all_admin_settings" ON public.admin_settings
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.admin_settings TO service_role;

-- ================================================================
-- VERIFICATION QUERY (run after applying the fix)
-- ================================================================
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('processors', 'processor_store_assignments', 'return_transactions', 'refresh_tokens', 'admin_settings')
--   AND policyname LIKE '%service_role%'
-- ORDER BY tablename, policyname;
--
-- ================================================================