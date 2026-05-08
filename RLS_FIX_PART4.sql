-- ================================================================
-- RLS FIX PART 4: Debit Memos, Payments & NDC Tables
-- ================================================================

-- 1. debit_memos
DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memos;
CREATE POLICY "service_role_all_debit_memos" ON public.debit_memos
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.debit_memos TO service_role;

-- 2. debit_memo_items
DROP POLICY IF EXISTS "Allow all access via service role" ON public.debit_memo_items;
CREATE POLICY "service_role_all_debit_memo_items" ON public.debit_memo_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.debit_memo_items TO service_role;

-- 3. pharmacy_payments
DROP POLICY IF EXISTS "Allow all access via service role" ON public.pharmacy_payments;
CREATE POLICY "service_role_all_pharmacy_payments" ON public.pharmacy_payments
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pharmacy_payments TO service_role;

-- 4. ndc_pricing
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_pricing;
CREATE POLICY "service_role_all_ndc_pricing" ON public.ndc_pricing
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_pricing TO service_role;

-- 5. ndc_price_history
DROP POLICY IF EXISTS "Allow all access via service role" ON public.ndc_price_history;
CREATE POLICY "service_role_all_ndc_price_history" ON public.ndc_price_history
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_price_history TO service_role;

-- 6. ndc_packages
DROP POLICY IF EXISTS "Custom Policy" ON public.ndc_packages;
CREATE POLICY "service_role_all_ndc_packages" ON public.ndc_packages
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_packages TO service_role;

-- 7. ndc_products
DROP POLICY IF EXISTS "Custom Policy" ON public.ndc_products;
CREATE POLICY "service_role_all_ndc_products" ON public.ndc_products
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_products TO service_role;

-- 8. ndc_pricing_index
DROP POLICY IF EXISTS "service_role_all_ndc_pricing_index" ON public.ndc_pricing_index;
CREATE POLICY "service_role_all_ndc_pricing_index" ON public.ndc_pricing_index
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ndc_pricing_index TO service_role;