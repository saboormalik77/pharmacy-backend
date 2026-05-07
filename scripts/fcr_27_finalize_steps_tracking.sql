-- ============================================================
-- FCR-27: Finalize Steps Tracking
--   1. Add finalize_steps JSONB column to return_transactions
--   2. Update _rt_to_json to include finalizeSteps
--   3. RPC: update_finalize_steps — updates the finalize_steps
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add finalize_steps column
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS finalize_steps JSONB DEFAULT '{"printManifest": false, "fedexEntered": false, "printJobSheets": false}'::jsonb;


-- ────────────────────────────────────────────────────────────
-- 2. Update _rt_to_json to include finalizeSteps
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _rt_to_json(r return_transactions)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'licensePlate',             r.license_plate,
    'pharmacyId',               r.pharmacy_id,
    'pharmacyName',             COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = r.pharmacy_id), ''),
    'processorId',              r.processor_id,
    'processorName',            COALESCE((SELECT name FROM processors WHERE id = r.processor_id), ''),
    'serviceType',              r.service_type,
    'status',                   r.status,
    'fedexTracking',            r.fedex_tracking,
    'fedexPickupConfirmation',  r.fedex_pickup_confirmation,
    'totalItems',               r.total_items,
    'totalReturnableValue',     r.total_returnable_value,
    'totalNonReturnableValue',  r.total_non_returnable_value,
    'batchId',                  r.batch_id,
    'timeIn',                   r.time_in,
    'timeOut',                  r.time_out,
    'receivedInWarehouseDate',  r.received_in_warehouse_date,
    'verifiedIntegrity',        r.verified_integrity,
    'notes',                    r.notes,
    'finalizedAt',              r.finalized_at,
    'boxCount',                 r.box_count,
    'manifestGeneratedAt',      r.manifest_generated_at,
    'prpNumber',                r.prp_number,
    'packageTracking',          r.package_tracking,
    'scannedPackages',          r.scanned_packages,
    'fedexShipmentId',          r.fedex_shipment_id,
    'fedexLabels',              r.fedex_labels,
    'finalizeSteps',            COALESCE(r.finalize_steps, '{"printManifest": false, "fedexEntered": false, "printJobSheets": false}'::jsonb),
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 3. RPC: update_finalize_steps
--    Merges the provided steps into the existing JSONB.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_finalize_steps(
  p_id    UUID,
  p_steps JSONB
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  UPDATE return_transactions
     SET finalize_steps = COALESCE(finalize_steps, '{}'::jsonb) || p_steps,
         updated_at     = NOW()
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'error', false,
    'data',  _rt_to_json(v_row)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Grants
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION update_finalize_steps TO authenticated, anon, service_role;
