-- Fix totalItems to count ALL items instead of just returnable + TBD
-- User reported: "the items count should be equal to the items inside the return detail page"
-- "I mean i think right now it only counts the returnable items. make it to count all items inside return."

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
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;

COMMENT ON FUNCTION _rt_to_json(return_transactions) IS
  'Return transaction as JSON for APIs; totalItems counts ALL items regardless of status (fixed for return list display)';