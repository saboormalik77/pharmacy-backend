-- ================================================================
-- RLS FIX PART 5 (SAFE): Products, Packages & Documents
-- ================================================================

-- products
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_products" ON public.products';
    EXECUTE 'CREATE POLICY "service_role_all_products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.products TO service_role';
    RAISE NOTICE 'Fixed: products';
  ELSE
    RAISE NOTICE 'Skipped: products (table does not exist)';
  END IF;
END $$;

-- product_list_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_list_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Custom Policy" ON public.product_list_items';
    EXECUTE 'CREATE POLICY "service_role_all_product_list_items" ON public.product_list_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.product_list_items TO service_role';
    RAISE NOTICE 'Fixed: product_list_items';
  ELSE
    RAISE NOTICE 'Skipped: product_list_items (table does not exist)';
  END IF;
END $$;

-- custom_packages
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'custom_packages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Policy" ON public.custom_packages';
    EXECUTE 'CREATE POLICY "service_role_all_custom_packages" ON public.custom_packages FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.custom_packages TO service_role';
    RAISE NOTICE 'Fixed: custom_packages';
  ELSE
    RAISE NOTICE 'Skipped: custom_packages (table does not exist)';
  END IF;
END $$;

-- custom_package_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'custom_package_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Custom Policy" ON public.custom_package_items';
    EXECUTE 'CREATE POLICY "service_role_all_custom_package_items" ON public.custom_package_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.custom_package_items TO service_role';
    RAISE NOTICE 'Fixed: custom_package_items';
  ELSE
    RAISE NOTICE 'Skipped: custom_package_items (table does not exist)';
  END IF;
END $$;

-- reverse_distributors
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reverse_distributors') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_reverse_distributors" ON public.reverse_distributors';
    EXECUTE 'CREATE POLICY "service_role_all_reverse_distributors" ON public.reverse_distributors FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.reverse_distributors TO service_role';
    RAISE NOTICE 'Fixed: reverse_distributors';
  ELSE
    RAISE NOTICE 'Skipped: reverse_distributors (table does not exist)';
  END IF;
END $$;

-- uploaded_documents
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'uploaded_documents') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_uploaded_documents" ON public.uploaded_documents';
    EXECUTE 'CREATE POLICY "service_role_all_uploaded_documents" ON public.uploaded_documents FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.uploaded_documents TO service_role';
    RAISE NOTICE 'Fixed: uploaded_documents';
  ELSE
    RAISE NOTICE 'Skipped: uploaded_documents (table does not exist)';
  END IF;
END $$;