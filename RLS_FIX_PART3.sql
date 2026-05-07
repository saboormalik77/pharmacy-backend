-- ================================================================
-- RLS FIX PART 3: Manufacturer & Policies Tables
-- ================================================================

-- 1. manufacturer_policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policies;
CREATE POLICY "service_role_all_manufacturer_policies" ON public.manufacturer_policies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_policies TO service_role;

-- 2. manufacturer_policy_notes
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policy_notes;
CREATE POLICY "service_role_all_manufacturer_policy_notes" ON public.manufacturer_policy_notes
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_policy_notes TO service_role;

-- 3. manufacturer_return_policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_return_policies;
CREATE POLICY "service_role_all_manufacturer_return_policies" ON public.manufacturer_return_policies
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.manufacturer_return_policies TO service_role;

-- 4. non_returnable_products
DROP POLICY IF EXISTS "Allow all access via service role" ON public.non_returnable_products;
CREATE POLICY "service_role_all_non_returnable_products" ON public.non_returnable_products
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.non_returnable_products TO service_role;