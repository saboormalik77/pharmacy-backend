-- Fix 1: Update _rt_to_json to compute totalItems live (only returnable + tbd)
-- IMPORTANT: This must include ALL fields from the latest _rt_to_json (fcr_44)
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
    'totalItems',               (SELECT COUNT(*)::INTEGER FROM return_transaction_items WHERE transaction_id = r.id AND return_status IN ('returnable', 'tbd')),
    'totalReturnableValue',     (SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items WHERE transaction_id = r.id AND return_status = 'returnable'),
    'totalNonReturnableValue',  (SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items WHERE transaction_id = r.id AND return_status = 'non_returnable'),
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

-- Fix 2: Update get_manifest_data to exclude non-returnable items
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
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  SELECT id, pharmacy_name, npi_number, dea_number, phone, email
  INTO v_pharmacy
  FROM pharmacy
  WHERE id = v_txn.pharmacy_id;

  SELECT name INTO v_processor_name FROM processors WHERE id = v_txn.processor_id;

  -- Returnable items only
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

  -- Non-returnable excluded from manifest
  v_non_returnable := '[]'::jsonb;

  -- Counts & values (only returnable + tbd for totalItems)
  SELECT COUNT(*) INTO v_item_count FROM return_transaction_items WHERE transaction_id = p_transaction_id AND return_status IN ('returnable', 'tbd');
  SELECT COUNT(*) INTO v_returnable_count FROM return_transaction_items WHERE transaction_id = p_transaction_id AND return_status = 'returnable';
  v_non_ret_count := 0;
  SELECT COALESCE(SUM(estimated_value), 0) INTO v_returnable_value FROM return_transaction_items WHERE transaction_id = p_transaction_id AND return_status = 'returnable';
  v_non_ret_value := 0;

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
        'totalValue',             v_returnable_value,
        'hasCiiItems',            v_has_cii
      ),
      'returnableItems',    v_returnable_items,
      'nonReturnableItems', v_non_returnable
    )
  );
END;
$$;