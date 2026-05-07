-- ================================================================
-- RLS FIX PART 2: Return & Batch Tables
-- ================================================================

-- 1. return_transaction_items
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transaction_items;
CREATE POLICY "service_role_all_return_transaction_items" ON public.return_transaction_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_transaction_items TO service_role;

-- 2. return_batches
DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_batches;
CREATE POLICY "service_role_all_return_batches" ON public.return_batches
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_batches TO service_role;

-- 3. return_reports
DROP POLICY IF EXISTS "Custom Policy" ON public.return_reports;
CREATE POLICY "service_role_all_return_reports" ON public.return_reports
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.return_reports TO service_role;

-- 4. batch_workflow_steps
DROP POLICY IF EXISTS "Allow all access via service role" ON public.batch_workflow_steps;
CREATE POLICY "service_role_all_batch_workflow_steps" ON public.batch_workflow_steps
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.batch_workflow_steps TO service_role;

-- 5. shipment_groups
DROP POLICY IF EXISTS "Allow all access via service role" ON public.shipment_groups;
CREATE POLICY "service_role_all_shipment_groups" ON public.shipment_groups
FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.shipment_groups TO service_role;