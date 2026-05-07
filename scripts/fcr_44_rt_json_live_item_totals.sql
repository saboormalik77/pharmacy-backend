-- FCR 44 — _rt_to_json: expose live item counts and value totals from return_transaction_items
-- instead of denormalized return_transactions columns. Those columns can drift if any path
-- deletes items without recalculating (e.g. before FCR 43). List/detail APIs then match reality.

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
    'totalItems',               (SELECT COUNT(*)::INTEGER FROM return_transaction_items WHERE transaction_id = r.id),
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
