-- ============================================================
-- FCR Module 24: FedEx/USPS Tracking with Package-Level Details
-- ============================================================
-- Adds:
--   1. New columns on return_transactions:
--        prp_number        TEXT     – FedEx PRP number (or "USPS")
--        package_tracking  JSONB    – Per-box tracking barcodes
--   2. Updated _rt_to_json to expose new fields
--   3. Updated finalize_return_transaction to accept/store them
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add new columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS prp_number       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS package_tracking JSONB DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Update _rt_to_json to include new columns
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
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Updated finalize_return_transaction RPC
--    Now accepts p_prp_number and p_package_tracking
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finalize_return_transaction(
  p_id               UUID,
  p_fedex_tracking   TEXT    DEFAULT NULL,
  p_box_count        INTEGER DEFAULT NULL,
  p_prp_number       TEXT    DEFAULT NULL,
  p_package_tracking JSONB   DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row   return_transactions;
  v_tbd   INTEGER;
  v_total INTEGER;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_row.status <> 'completed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot finalize a return with status "%s". Must be completed first.', v_row.status));
  END IF;

  SELECT COUNT(*) INTO v_total FROM return_transaction_items WHERE transaction_id = p_id;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot finalize a return with no items.');
  END IF;

  SELECT COUNT(*) INTO v_tbd
    FROM return_transaction_items
   WHERE transaction_id = p_id
     AND return_status = 'tbd';

  IF v_tbd > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot finalize: %s item(s) still have TBD status.', v_tbd));
  END IF;

  -- FedEx tracking: use provided value or existing value
  IF p_fedex_tracking IS NOT NULL AND TRIM(p_fedex_tracking) <> '' THEN
    v_row.fedex_tracking := TRIM(p_fedex_tracking);
  END IF;

  IF v_row.fedex_tracking IS NULL OR TRIM(v_row.fedex_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot finalize: FedEx tracking number is required.');
  END IF;

  UPDATE return_transactions SET
    status             = 'finalized',
    finalized_at       = NOW(),
    fedex_tracking     = v_row.fedex_tracking,
    box_count          = COALESCE(p_box_count, box_count),
    prp_number         = COALESCE(NULLIF(TRIM(p_prp_number), ''), prp_number),
    package_tracking   = COALESCE(p_package_tracking, package_tracking)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;
