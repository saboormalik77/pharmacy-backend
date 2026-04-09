-- ============================================================
-- FCR-49: _rt_to_json — warehouse verification UI fields
-- ============================================================
-- Adds verifiedAt, verificationCompletedAt, and verificationStatus
-- so list endpoints (e.g. warehouse_list_received) show correct
-- badges/actions (Completed / In Progress / Not Started).
--
-- Must match semantics in fcr_48_warehouse_list_received_v2_status_filters.sql.
-- Requires: return_transactions.verification_completed_at (FCR-47).
--
-- Replaces _rt_to_json from fix_totals_and_manifest.sql (same shape + new keys).
-- ============================================================

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
    'verifiedAt',               r.verified_at,
    'verifiedBy',               r.verified_by,
    'piecesReceived',           r.pieces_received,
    'verificationCompletedAt', r.verification_completed_at,
    'verificationStatus',
      CASE
        WHEN r.verification_completed_at IS NOT NULL
          OR r.status IN ('verified', 'closed', 'closed_out')
          OR (r.status = 'received' AND r.verified_integrity IS TRUE)
        THEN 'completed'
        WHEN r.status = 'received'
          AND r.verification_completed_at IS NULL
          AND r.verified_at IS NOT NULL
          AND COALESCE(r.verified_integrity, false) = false
        THEN 'in_progress'
        WHEN r.status = 'received'
          AND r.verification_completed_at IS NULL
          AND r.verified_at IS NULL
        THEN 'not_started'
        ELSE NULL
      END,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;

COMMENT ON FUNCTION _rt_to_json(return_transactions) IS
  'Return transaction as JSON for APIs; includes warehouse v2 verificationStatus (FCR-49).';
