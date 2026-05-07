-- ================================================================
-- RLS FIX PART 3 (SAFE): Manufacturer & Policy Tables
-- ================================================================

-- manufacturer_policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manufacturer_policies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policies';
    EXECUTE 'CREATE POLICY "service_role_all_manufacturer_policies" ON public.manufacturer_policies FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.manufacturer_policies TO service_role';
    RAISE NOTICE 'Fixed: manufacturer_policies';
  ELSE
    RAISE NOTICE 'Skipped: manufacturer_policies (table does not exist)';
  END IF;
END $$;

-- manufacturer_policy_notes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manufacturer_policy_notes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_policy_notes';
    EXECUTE 'CREATE POLICY "service_role_all_manufacturer_policy_notes" ON public.manufacturer_policy_notes FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.manufacturer_policy_notes TO service_role';
    RAISE NOTICE 'Fixed: manufacturer_policy_notes';
  ELSE
    RAISE NOTICE 'Skipped: manufacturer_policy_notes (table does not exist)';
  END IF;
END $$;

-- manufacturer_return_policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manufacturer_return_policies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.manufacturer_return_policies';
    EXECUTE 'CREATE POLICY "service_role_all_manufacturer_return_policies" ON public.manufacturer_return_policies FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.manufacturer_return_policies TO service_role';
    RAISE NOTICE 'Fixed: manufacturer_return_policies';
  ELSE
    RAISE NOTICE 'Skipped: manufacturer_return_policies (table does not exist)';
  END IF;
END $$;

-- non_returnable_products
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'non_returnable_products') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.non_returnable_products';
    EXECUTE 'CREATE POLICY "service_role_all_non_returnable_products" ON public.non_returnable_products FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.non_returnable_products TO service_role';
    RAISE NOTICE 'Fixed: non_returnable_products';
  ELSE
    RAISE NOTICE 'Skipped: non_returnable_products (table does not exist)';
  END IF;
END $$;