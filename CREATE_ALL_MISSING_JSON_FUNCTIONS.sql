-- ================================================================
-- CREATE ALL MISSING JSON HELPER FUNCTIONS
-- ================================================================
-- 
-- These functions convert table rows to JSON and are used by RPC functions
-- They may be missing from your live database
--
-- ================================================================

-- 1. _rti_to_json for return_transaction_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_transaction_items') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public._rti_to_json(r public.return_transaction_items) 
    RETURNS jsonb
    LANGUAGE sql STABLE
    AS $func$
      SELECT jsonb_build_object(
        ''id'',                      r.id,
        ''transactionId'',           r.transaction_id,
        ''ndc'',                     r.ndc,
        ''ndc10'',                   r.ndc_10,
        ''gtin'',                    r.gtin,
        ''proprietaryName'',         r.proprietary_name,
        ''genericName'',             r.generic_name,
        ''manufacturer'',            r.manufacturer,
        ''packageDescription'',      r.package_description,
        ''dosageForm'',              r.dosage_form,
        ''strength'',                r.strength,
        ''route'',                   r.route,
        ''lotNumber'',               r.lot_number,
        ''serialNumber'',            r.serial_number,
        ''expirationDate'',          r.expiration_date,
        ''standardPrice'',           r.standard_price,
        ''estimatedValue'',          r.estimated_value,
        ''quantity'',                r.quantity,
        ''fullPackageSize'',         r.full_package_size,
        ''fullPackageQtyReturned'',  r.full_package_qty_returned,
        ''isPartial'',               r.is_partial,
        ''partialPercentage'',       r.partial_percentage,
        ''returnStatus'',            r.return_status,
        ''nonReturnableReason'',     r.non_returnable_reason,
        ''returnReason'',            r.return_reason,
        ''destination'',             r.destination,
        ''deaSchedule'',             r.dea_schedule,
        ''deaForm222Required'',      r.dea_form_222_required,
        ''productType'',             r.product_type,
        ''coStatus'',                r.co_status,
        ''bmpStatus'',               r.bmp_status,
        ''memo'',                    r.memo,
        ''scanSource'',              r.scan_source,
        ''rawScanData'',             r.raw_scan_data,
        ''wineCellarId'',            r.wine_cellar_id,
        ''createdAt'',               r.created_at,
        ''updatedAt'',               r.updated_at
      );
    $func$';
    
    EXECUTE 'GRANT ALL ON FUNCTION public._rti_to_json(r public.return_transaction_items) TO anon';
    EXECUTE 'GRANT ALL ON FUNCTION public._rti_to_json(r public.return_transaction_items) TO authenticated';
    EXECUTE 'GRANT ALL ON FUNCTION public._rti_to_json(r public.return_transaction_items) TO service_role';
    
    RAISE NOTICE 'Created: _rti_to_json function';
  ELSE
    RAISE NOTICE 'Skipped: _rti_to_json (return_transaction_items table does not exist)';
  END IF;
END $$;

-- 2. _rt_to_json for return_transactions
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_transactions') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public._rt_to_json(r public.return_transactions) 
    RETURNS jsonb
    LANGUAGE sql STABLE
    AS $func$
      SELECT jsonb_build_object(
        ''id'',               r.id,
        ''pharmacyId'',       r.pharmacy_id,
        ''processorId'',      r.processor_id,
        ''batchId'',          r.batch_id,
        ''status'',           r.status,
        ''returnType'',       r.return_type,
        ''notes'',            r.notes,
        ''isLocked'',         r.is_locked,
        ''lockedBy'',         r.locked_by,
        ''lockedAt'',         r.locked_at,
        ''createdAt'',        r.created_at,
        ''updatedAt'',        r.updated_at,
        ''receivedAt'',       r.received_at,
        ''finalizedAt'',      r.finalized_at
      );
    $func$';
    
    EXECUTE 'GRANT ALL ON FUNCTION public._rt_to_json(r public.return_transactions) TO anon';
    EXECUTE 'GRANT ALL ON FUNCTION public._rt_to_json(r public.return_transactions) TO authenticated';
    EXECUTE 'GRANT ALL ON FUNCTION public._rt_to_json(r public.return_transactions) TO service_role';
    
    RAISE NOTICE 'Created: _rt_to_json function';
  ELSE
    RAISE NOTICE 'Skipped: _rt_to_json (return_transactions table does not exist)';
  END IF;
END $$;

-- 3. _batch_to_json for return_batches
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'return_batches') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public._batch_to_json(r public.return_batches) 
    RETURNS jsonb
    LANGUAGE sql STABLE
    AS $func$
      SELECT jsonb_build_object(
        ''id'',              r.id,
        ''batchMonth'',      r.batch_month,
        ''status'',          r.status,
        ''totalReturns'',    r.total_returns,
        ''totalValue'',      r.total_value,
        ''createdAt'',       r.created_at,
        ''updatedAt'',       r.updated_at,
        ''finalizedAt'',     r.finalized_at
      );
    $func$';
    
    EXECUTE 'GRANT ALL ON FUNCTION public._batch_to_json(r public.return_batches) TO anon';
    EXECUTE 'GRANT ALL ON FUNCTION public._batch_to_json(r public.return_batches) TO authenticated';
    EXECUTE 'GRANT ALL ON FUNCTION public._batch_to_json(r public.return_batches) TO service_role';
    
    RAISE NOTICE 'Created: _batch_to_json function';
  ELSE
    RAISE NOTICE 'Skipped: _batch_to_json (return_batches table does not exist)';
  END IF;
END $$;

-- 4. _debit_memo_to_json for debit_memos
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'debit_memos') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public._debit_memo_to_json(d public.debit_memos) 
    RETURNS jsonb
    LANGUAGE sql STABLE
    AS $func$
      SELECT jsonb_build_object(
        ''id'',               d.id,
        ''batchId'',          d.batch_id,
        ''memoNumber'',       d.memo_number,
        ''totalValue'',       d.total_value,
        ''status'',           d.status,
        ''createdAt'',        d.created_at,
        ''updatedAt'',        d.updated_at
      );
    $func$';
    
    EXECUTE 'GRANT ALL ON FUNCTION public._debit_memo_to_json(d public.debit_memos) TO anon';
    EXECUTE 'GRANT ALL ON FUNCTION public._debit_memo_to_json(d public.debit_memos) TO authenticated';
    EXECUTE 'GRANT ALL ON FUNCTION public._debit_memo_to_json(d public.debit_memos) TO service_role';
    
    RAISE NOTICE 'Created: _debit_memo_to_json function';
  ELSE
    RAISE NOTICE 'Skipped: _debit_memo_to_json (debit_memos table does not exist)';
  END IF;
END $$;

-- 5. _pharmacy_payment_to_json for pharmacy_payments
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pharmacy_payments') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) 
    RETURNS jsonb
    LANGUAGE sql STABLE
    AS $func$
      SELECT jsonb_build_object(
        ''id'',               p.id,
        ''pharmacyId'',       p.pharmacy_id,
        ''batchId'',          p.batch_id,
        ''paymentAmount'',    p.payment_amount,
        ''paymentDate'',      p.payment_date,
        ''paymentMethod'',    p.payment_method,
        ''status'',           p.status,
        ''createdAt'',        p.created_at,
        ''updatedAt'',        p.updated_at
      );
    $func$';
    
    EXECUTE 'GRANT ALL ON FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) TO anon';
    EXECUTE 'GRANT ALL ON FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) TO authenticated';
    EXECUTE 'GRANT ALL ON FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) TO service_role';
    
    RAISE NOTICE 'Created: _pharmacy_payment_to_json function';
  ELSE
    RAISE NOTICE 'Skipped: _pharmacy_payment_to_json (pharmacy_payments table does not exist)';
  END IF;
END $$;

-- 6. _shipment_group_to_json for shipment_groups
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shipment_groups') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public._shipment_group_to_json(r public.shipment_groups) 
    RETURNS jsonb
    LANGUAGE sql STABLE
    AS $func$
      SELECT jsonb_build_object(
        ''id'',                    r.id,
        ''destination'',           r.destination,
        ''outboundTracking'',      r.outbound_tracking,
        ''inboundTracking'',       r.inbound_tracking,
        ''status'',                r.status,
        ''shippedAt'',             r.shipped_at,
        ''deliveredAt'',           r.delivered_at,
        ''createdAt'',             r.created_at,
        ''updatedAt'',             r.updated_at
      );
    $func$';
    
    EXECUTE 'GRANT ALL ON FUNCTION public._shipment_group_to_json(r public.shipment_groups) TO anon';
    EXECUTE 'GRANT ALL ON FUNCTION public._shipment_group_to_json(r public.shipment_groups) TO authenticated';
    EXECUTE 'GRANT ALL ON FUNCTION public._shipment_group_to_json(r public.shipment_groups) TO service_role';
    
    RAISE NOTICE 'Created: _shipment_group_to_json function';
  ELSE
    RAISE NOTICE 'Skipped: _shipment_group_to_json (shipment_groups table does not exist)';
  END IF;
END $$;

-- 7. _wc_to_json for wine_cellar
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wine_cellar') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public._wc_to_json(r public.wine_cellar) 
    RETURNS jsonb
    LANGUAGE sql STABLE
    AS $func$
      SELECT jsonb_build_object(
        ''id'',                      r.id,
        ''pharmacyId'',              r.pharmacy_id,
        ''transactionItemId'',       r.transaction_item_id,
        ''ndc'',                     r.ndc,
        ''productName'',             r.product_name,
        ''manufacturer'',            r.manufacturer,
        ''lotNumber'',               r.lot_number,
        ''serialNumber'',            r.serial_number,
        ''expirationDate'',          r.expiration_date,
        ''quantity'',                r.quantity,
        ''standardPrice'',           r.standard_price,
        ''isPartial'',               r.is_partial,
        ''partialPercentage'',       r.partial_percentage,
        ''expectedReturnableDate'',  r.expected_returnable_date,
        ''physicalLocation'',        r.physical_location,
        ''baggieBarcode'',           r.baggie_barcode,
        ''notes'',                   r.notes,
        ''status'',                  r.status,
        ''createdBy'',               r.created_by,
        ''createdAt'',               r.created_at,
        ''updatedAt'',               r.updated_at
      );
    $func$';
    
    EXECUTE 'GRANT ALL ON FUNCTION public._wc_to_json(r public.wine_cellar) TO anon';
    EXECUTE 'GRANT ALL ON FUNCTION public._wc_to_json(r public.wine_cellar) TO authenticated';
    EXECUTE 'GRANT ALL ON FUNCTION public._wc_to_json(r public.wine_cellar) TO service_role';
    
    RAISE NOTICE 'Created: _wc_to_json function';
  ELSE
    RAISE NOTICE 'Skipped: _wc_to_json (wine_cellar table does not exist)';
  END IF;
END $$;