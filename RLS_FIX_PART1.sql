-- ================================================================
-- RLS FIX PART 1: Core Tables (Run this first)
-- ================================================================

-- 1. processors (your main error)
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processors;
CREATE POLICY "service_role_all_processors" ON public.processors
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processors TO service_role;

-- 2. processor_store_assignments
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processor_store_assignments;
CREATE POLICY "service_role_all_processor_store_assignments" ON public.processor_store_assignments
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.processor_store_assignments TO service_role;

-- 3. return_transactions
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transactions;
CREATE POLICY "service_role_all_return_transactions" ON public.return_transactions
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_transactions TO service_role;

-- 4. refresh_tokens
DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public.refresh_tokens;
CREATE POLICY "service_role_all_refresh_tokens" ON public.refresh_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.refresh_tokens TO service_role;

-- 5. admin
DROP POLICY IF EXISTS "policy" ON public.admin;
CREATE POLICY "service_role_all_admin" ON public.admin
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.admin TO service_role;