-- ================================================================
-- RLS FIX PART 2 (SAFE): Return & Batch Tables
-- ================================================================

-- return_transaction_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_transaction_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_transaction_items';
    EXECUTE 'CREATE POLICY "service_role_all_return_transaction_items" ON public.return_transaction_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.return_transaction_items TO service_role';
    RAISE NOTICE 'Fixed: return_transaction_items';
  ELSE
    RAISE NOTICE 'Skipped: return_transaction_items (table does not exist)';
  END IF;
END $$;

-- return_batches
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_batches') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.return_batches';
    EXECUTE 'CREATE POLICY "service_role_all_return_batches" ON public.return_batches FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.return_batches TO service_role';
    RAISE NOTICE 'Fixed: return_batches';
  ELSE
    RAISE NOTICE 'Skipped: return_batches (table does not exist)';
  END IF;
END $$;

-- return_reports
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_reports') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Custom Policy" ON public.return_reports';
    EXECUTE 'CREATE POLICY "service_role_all_return_reports" ON public.return_reports FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.return_reports TO service_role';
    RAISE NOTICE 'Fixed: return_reports';
  ELSE
    RAISE NOTICE 'Skipped: return_reports (table does not exist)';
  END IF;
END $$;

-- batch_workflow_steps
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'batch_workflow_steps') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.batch_workflow_steps';
    EXECUTE 'CREATE POLICY "service_role_all_batch_workflow_steps" ON public.batch_workflow_steps FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.batch_workflow_steps TO service_role';
    RAISE NOTICE 'Fixed: batch_workflow_steps';
  ELSE
    RAISE NOTICE 'Skipped: batch_workflow_steps (table does not exist)';
  END IF;
END $$;

-- shipment_groups
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shipment_groups') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all access via service role" ON public.shipment_groups';
    EXECUTE 'CREATE POLICY "service_role_all_shipment_groups" ON public.shipment_groups FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT ALL ON TABLE public.shipment_groups TO service_role';
    RAISE NOTICE 'Fixed: shipment_groups';
  ELSE
    RAISE NOTICE 'Skipped: shipment_groups (table does not exist)';
  END IF;
END $$;