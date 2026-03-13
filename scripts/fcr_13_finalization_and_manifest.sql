-- ============================================================
-- FCR Module 13: Return Finalization, Manifest & DEA Form 222
-- ============================================================
-- Adds:
--   1. New columns: box_count, manifest_generated_at
--   2. Updated _rt_to_json to include new columns
--   3. Enhanced finalize_return_transaction RPC with validation
--   4. get_manifest_data RPC — complete manifest data for PDF
--   5. get_dea_form_222_data RPC — Schedule II items for DEA form
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add new columns to return_transactions
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS box_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manifest_generated_at TIMESTAMPTZ DEFAULT NULL;


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
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 3. Enhanced finalize_return_transaction RPC
--    Validates:
--      a) Status must be 'completed'
--      b) No TBD items remaining (all items have destination)
--      c) FedEx tracking must be entered
--    Then sets status = 'finalized', finalized_at = NOW()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finalize_return_transaction(
  p_id             UUID,
  p_fedex_tracking TEXT DEFAULT NULL,
  p_box_count      INTEGER DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row   return_transactions;
  v_tbd   INTEGER;
  v_total INTEGER;
BEGIN
  -- Fetch the return
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Must be completed first
  IF v_row.status <> 'completed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot finalize a return with status "%s". Must be completed first.', v_row.status));
  END IF;

  -- Check total items
  SELECT COUNT(*) INTO v_total FROM return_transaction_items WHERE transaction_id = p_id;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot finalize a return with no items.');
  END IF;

  -- Check for TBD items (items without a destination assigned)
  SELECT COUNT(*) INTO v_tbd
    FROM return_transaction_items
   WHERE transaction_id = p_id
     AND return_status = 'tbd';

  IF v_tbd > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot finalize: %s item(s) still have TBD status. All items must be classified before finalizing.', v_tbd));
  END IF;

  -- FedEx tracking: use provided value or existing value
  IF p_fedex_tracking IS NOT NULL AND TRIM(p_fedex_tracking) <> '' THEN
    v_row.fedex_tracking := TRIM(p_fedex_tracking);
  END IF;

  IF v_row.fedex_tracking IS NULL OR TRIM(v_row.fedex_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot finalize: FedEx tracking number is required. Please enter it before finalizing.');
  END IF;

  -- All validations passed — finalize
  UPDATE return_transactions SET
    status           = 'finalized',
    finalized_at     = NOW(),
    fedex_tracking   = v_row.fedex_tracking,
    box_count        = COALESCE(p_box_count, box_count)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. get_manifest_data RPC
--    Returns complete manifest data in one call:
--      - Return transaction details
--      - Pharmacy info (name, DEA, NPI, phone)
--      - Processor info
--      - All items grouped by return_status
--      - Summary totals
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_manifest_data(p_transaction_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn              return_transactions;
  v_pharmacy         RECORD;
  v_processor_name   TEXT;
  v_returnable_items jsonb;
  v_non_returnable   jsonb;
  v_item_count       INTEGER;
  v_returnable_count INTEGER;
  v_non_ret_count    INTEGER;
  v_returnable_value DECIMAL(12,2);
  v_non_ret_value    DECIMAL(12,2);
  v_has_cii          BOOLEAN;
BEGIN
  -- Fetch the transaction
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Fetch pharmacy info
  SELECT
    id, pharmacy_name, npi_number, dea_number, phone, email
  INTO v_pharmacy
  FROM pharmacy
  WHERE id = v_txn.pharmacy_id;

  -- Fetch processor name
  SELECT name INTO v_processor_name FROM processors WHERE id = v_txn.processor_id;

  -- Returnable items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',              rti.ndc,
      'ndc10',            rti.ndc_10,
      'proprietaryName',  rti.proprietary_name,
      'genericName',      rti.generic_name,
      'manufacturer',     rti.manufacturer,
      'lotNumber',        rti.lot_number,
      'expirationDate',   rti.expiration_date,
      'quantity',         rti.quantity,
      'standardPrice',    rti.standard_price,
      'estimatedValue',   rti.estimated_value,
      'destination',      rti.destination,
      'deaSchedule',      rti.dea_schedule,
      'isPartial',        rti.is_partial,
      'partialPercentage',rti.partial_percentage,
      'strength',         rti.strength,
      'dosageForm',       rti.dosage_form
    ) ORDER BY rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_returnable_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.return_status = 'returnable';

  -- Non-returnable items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',                rti.ndc,
      'ndc10',              rti.ndc_10,
      'proprietaryName',    rti.proprietary_name,
      'genericName',        rti.generic_name,
      'manufacturer',       rti.manufacturer,
      'lotNumber',          rti.lot_number,
      'expirationDate',     rti.expiration_date,
      'quantity',           rti.quantity,
      'standardPrice',      rti.standard_price,
      'estimatedValue',     rti.estimated_value,
      'nonReturnableReason',rti.non_returnable_reason,
      'deaSchedule',        rti.dea_schedule,
      'isPartial',          rti.is_partial,
      'partialPercentage',  rti.partial_percentage,
      'destination',        rti.destination,
      'strength',           rti.strength,
      'dosageForm',         rti.dosage_form
    ) ORDER BY rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_non_returnable
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.return_status = 'non_returnable';

  -- Counts & values
  SELECT COUNT(*) INTO v_item_count FROM return_transaction_items WHERE transaction_id = p_transaction_id;
  SELECT COUNT(*) INTO v_returnable_count FROM return_transaction_items WHERE transaction_id = p_transaction_id AND return_status = 'returnable';
  SELECT COUNT(*) INTO v_non_ret_count FROM return_transaction_items WHERE transaction_id = p_transaction_id AND return_status = 'non_returnable';
  SELECT COALESCE(SUM(estimated_value), 0) INTO v_returnable_value FROM return_transaction_items WHERE transaction_id = p_transaction_id AND return_status = 'returnable';
  SELECT COALESCE(SUM(estimated_value), 0) INTO v_non_ret_value FROM return_transaction_items WHERE transaction_id = p_transaction_id AND return_status = 'non_returnable';

  -- Check if CII items exist
  SELECT EXISTS(
    SELECT 1 FROM return_transaction_items
    WHERE transaction_id = p_transaction_id
      AND dea_form_222_required = true
  ) INTO v_has_cii;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction', jsonb_build_object(
        'id',                      v_txn.id,
        'licensePlate',            v_txn.license_plate,
        'status',                  v_txn.status,
        'fedexTracking',           v_txn.fedex_tracking,
        'fedexPickupConfirmation', v_txn.fedex_pickup_confirmation,
        'boxCount',                v_txn.box_count,
        'serviceType',             v_txn.service_type,
        'timeIn',                  v_txn.time_in,
        'timeOut',                 v_txn.time_out,
        'finalizedAt',             v_txn.finalized_at,
        'notes',                   v_txn.notes,
        'createdAt',               v_txn.created_at
      ),
      'pharmacy', jsonb_build_object(
        'id',           v_pharmacy.id,
        'name',         v_pharmacy.pharmacy_name,
        'npiNumber',    v_pharmacy.npi_number,
        'deaNumber',    v_pharmacy.dea_number,
        'phone',        v_pharmacy.phone,
        'email',        v_pharmacy.email
      ),
      'processor', jsonb_build_object(
        'id',   v_txn.processor_id,
        'name', v_processor_name
      ),
      'summary', jsonb_build_object(
        'totalItems',             v_item_count,
        'returnableCount',        v_returnable_count,
        'nonReturnableCount',     v_non_ret_count,
        'totalReturnableValue',   v_returnable_value,
        'totalNonReturnableValue',v_non_ret_value,
        'totalValue',             v_returnable_value + v_non_ret_value,
        'hasCiiItems',            v_has_cii
      ),
      'returnableItems',    v_returnable_items,
      'nonReturnableItems', v_non_returnable
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. get_dea_form_222_data RPC
--    Returns:
--      - Transaction + pharmacy info
--      - Only Schedule II items (dea_form_222_required = true)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dea_form_222_data(p_transaction_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn          return_transactions;
  v_pharmacy     RECORD;
  v_items        jsonb;
  v_item_count   INTEGER;
  v_total_value  DECIMAL(12,2);
BEGIN
  -- Fetch the transaction
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Fetch pharmacy info
  SELECT
    id, pharmacy_name, npi_number, dea_number, phone, email
  INTO v_pharmacy
  FROM pharmacy
  WHERE id = v_txn.pharmacy_id;

  -- Schedule II items only (dea_form_222_required = true)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',              rti.ndc,
      'ndc10',            rti.ndc_10,
      'proprietaryName',  rti.proprietary_name,
      'genericName',      rti.generic_name,
      'manufacturer',     rti.manufacturer,
      'lotNumber',        rti.lot_number,
      'serialNumber',     rti.serial_number,
      'expirationDate',   rti.expiration_date,
      'quantity',         rti.quantity,
      'standardPrice',    rti.standard_price,
      'estimatedValue',   rti.estimated_value,
      'deaSchedule',      rti.dea_schedule,
      'strength',         rti.strength,
      'dosageForm',       rti.dosage_form,
      'returnStatus',     rti.return_status,
      'destination',      rti.destination,
      'isPartial',        rti.is_partial,
      'partialPercentage',rti.partial_percentage
    ) ORDER BY rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.dea_form_222_required = true;

  -- Count & total
  SELECT COUNT(*), COALESCE(SUM(estimated_value), 0)
  INTO v_item_count, v_total_value
  FROM return_transaction_items
  WHERE transaction_id = p_transaction_id
    AND dea_form_222_required = true;

  IF v_item_count = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'No Schedule II (CII) items found requiring DEA Form 222.');
  END IF;


  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction', jsonb_build_object(
        'id',            v_txn.id,
        'licensePlate',  v_txn.license_plate,
        'status',        v_txn.status,
        'fedexTracking', v_txn.fedex_tracking,
        'finalizedAt',   v_txn.finalized_at,
        'createdAt',     v_txn.created_at
      ),
      'pharmacy', jsonb_build_object(
        'id',        v_pharmacy.id,
        'name',      v_pharmacy.pharmacy_name,
        'npiNumber', v_pharmacy.npi_number,
        'deaNumber', v_pharmacy.dea_number,
        'phone',     v_pharmacy.phone,
        'email',     v_pharmacy.email
      ),
      'summary', jsonb_build_object(
        'totalCiiItems', v_item_count,
        'totalValue',    v_total_value
      ),
      'items', v_items
    )
  );
END;
$$;
