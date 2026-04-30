-- ================================================================
-- RLS FIX PART 5: Products, Packages & Documents
-- ================================================================

-- 1. products
DROP POLICY IF EXISTS "service_role_all_products" ON public.products;
CREATE POLICY "service_role_all_products" ON public.products
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.products TO service_role;

-- 2. product_list_items
DROP POLICY IF EXISTS "Custom Policy" ON public.product_list_items;
CREATE POLICY "service_role_all_product_list_items" ON public.product_list_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.product_list_items TO service_role;

-- 3. custom_packages
DROP POLICY IF EXISTS "Policy" ON public.custom_packages;
CREATE POLICY "service_role_all_custom_packages" ON public.custom_packages
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.custom_packages TO service_role;

-- 4. custom_package_items
DROP POLICY IF EXISTS "Custom Policy" ON public.custom_package_items;
CREATE POLICY "service_role_all_custom_package_items" ON public.custom_package_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.custom_package_items TO service_role;

-- 5. reverse_distributors
DROP POLICY IF EXISTS "service_role_all_reverse_distributors" ON public.reverse_distributors;
CREATE POLICY "service_role_all_reverse_distributors" ON public.reverse_distributors
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.reverse_distributors TO service_role;

-- 6. uploaded_documents
DROP POLICY IF EXISTS "service_role_all_uploaded_documents" ON public.uploaded_documents;
CREATE POLICY "service_role_all_uploaded_documents" ON public.uploaded_documents
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.uploaded_documents TO service_role;