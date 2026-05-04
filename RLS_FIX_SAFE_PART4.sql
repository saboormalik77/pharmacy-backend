-- ================================================================
-- RLS FIX PART 4 (SAFE): Debit Memos, Payments & NDC Tables
-- ================================================================

-- debit_memos
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'debit_memos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memos';
    EXECUTE 'CREATE POLICY "service_role_all_debit_memos" ON public.debit_memos FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.debit_memos TO service_role';
    RAISE NOTICE 'Fixed: debit_memos';
  ELSE
    RAISE NOTICE 'Skipped: debit_memos (table does not exist)';
  END IF;
END $$;

-- debit_memo_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'debit_memo_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memo_items';
    EXECUTE 'CREATE POLICY "service_role_all_debit_memo_items" ON public.debit_memo_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.debit_memo_items TO service_role';
    RAISE NOTICE 'Fixed: debit_memo_items';
  ELSE
    RAISE NOTICE 'Skipped: debit_memo_items (table does not exist)';
  END IF;
END $$;

-- pharmacy_payments
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pharmacy_payments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.pharmacy_payments';
    EXECUTE 'CREATE POLICY "service_role_all_pharmacy_payments" ON public.pharmacy_payments FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.pharmacy_payments TO service_role';
    RAISE NOTICE 'Fixed: pharmacy_payments';
  ELSE
    RAISE NOTICE 'Skipped: pharmacy_payments (table does not exist)';
  END IF;
END $$;

-- ndc_pricing
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ndc_pricing') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_pricing';
    EXECUTE 'CREATE POLICY "service_role_all_ndc_pricing" ON public.ndc_pricing FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.ndc_pricing TO service_role';
    RAISE NOTICE 'Fixed: ndc_pricing';
  ELSE
    RAISE NOTICE 'Skipped: ndc_pricing (table does not exist)';
  END IF;
END $$;

-- ndc_price_history
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ndc_price_history') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_price_history';
    EXECUTE 'CREATE POLICY "service_role_all_ndc_price_history" ON public.ndc_price_history FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.ndc_price_history TO service_role';
    RAISE NOTICE 'Fixed: ndc_price_history';
  ELSE
    RAISE NOTICE 'Skipped: ndc_price_history (table does not exist)';
  END IF;
END $$;

-- ndc_packages
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ndc_packages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Custom Policy" ON public.ndc_packages';
    EXECUTE 'CREATE POLICY "service_role_all_ndc_packages" ON public.ndc_packages FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.ndc_packages TO service_role';
    RAISE NOTICE 'Fixed: ndc_packages';
  ELSE
    RAISE NOTICE 'Skipped: ndc_packages (table does not exist)';
  END IF;
END $$;

-- ndc_products
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ndc_products') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Custom Policy" ON public.ndc_products';
    EXECUTE 'CREATE POLICY "service_role_all_ndc_products" ON public.ndc_products FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.ndc_products TO service_role';
    RAISE NOTICE 'Fixed: ndc_products';
  ELSE
    RAISE NOTICE 'Skipped: ndc_products (table does not exist)';
  END IF;
END $$;

-- ndc_pricing_index
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ndc_pricing_index') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_all_ndc_pricing_index" ON public.ndc_pricing_index';
    EXECUTE 'CREATE POLICY "service_role_all_ndc_pricing_index" ON public.ndc_pricing_index FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.ndc_pricing_index TO service_role';
    RAISE NOTICE 'Fixed: ndc_pricing_index';
  ELSE
    RAISE NOTICE 'Skipped: ndc_pricing_index (table does not exist)';
  END IF;
END $$;