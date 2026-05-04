-- ============================================================
-- FIX: Finalize Steps Complete Fix
-- Problems:
--   1. update_finalize_steps only allowed updates for 'completed' status
--   2. The _rt_to_json function might be outdated in production
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Ensure the finalize_steps column exists with default
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS finalize_steps JSONB 
  DEFAULT '{"printManifest": false, "fedexEntered": false, "printJobSheets": false}'::jsonb;

-- ────────────────────────────────────────────────────────────
-- 2. Fix _rt_to_json to include finalizeSteps
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._rt_to_json(r public.return_transactions)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
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
  'totalItems',               (SELECT COUNT(*)::INTEGER FROM return_transaction_items WHERE transaction_id = r.id AND return_status IN ('returnable', 'tbd') AND (verification_status IS NULL OR verification_status = 'correct')),
  'totalReturnableValue',     (SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items WHERE transaction_id = r.id AND return_status = 'returnable' AND (verification_status IS NULL OR verification_status = 'correct')),
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
  'verificationCompletedAt',  r.verification_completed_at,
  'verificationStatus',       CASE 
                                WHEN r.verification_completed_at IS NOT NULL 
                                     OR r.status IN ('verified', 'closed', 'closed_out') 
                                     OR (r.status = 'received' AND r.verified_integrity IS TRUE) THEN 'completed'
                                WHEN r.status = 'received' 
                                     AND r.verification_completed_at IS NULL 
                                     AND r.verified_at IS NOT NULL 
                                     AND COALESCE(r.verified_integrity, false) = false THEN 'in_progress'
                                WHEN r.status = 'received' 
                                     AND r.verification_completed_at IS NULL 
                                     AND r.verified_at IS NULL THEN 'not_started'
                                ELSE NULL 
                              END,
  'createdAt',                r.created_at,
  'updatedAt',                r.updated_at
);
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Fix update_finalize_steps to allow updates for ANY status
--    EXCEPT 'finalized' (permanently locked)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_finalize_steps(p_id uuid, p_steps jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Only block if already finalized (permanently locked)
  -- Allow finalize steps updates for ALL other statuses
  IF v_row.status = 'finalized' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot update finalize steps for a finalized return. The return is permanently locked.');
  END IF;

  -- Merge the new steps with existing steps
  UPDATE return_transactions
     SET finalize_steps = COALESCE(finalize_steps, '{"printManifest": false, "fedexEntered": false, "printJobSheets": false}'::jsonb) || p_steps,
         updated_at     = NOW()
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'error', false,
    'data',  _rt_to_json(v_row)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public._rt_to_json(public.return_transactions) TO anon;
GRANT EXECUTE ON FUNCTION public._rt_to_json(public.return_transactions) TO authenticated;
GRANT EXECUTE ON FUNCTION public._rt_to_json(public.return_transactions) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_finalize_steps(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.update_finalize_steps(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_finalize_steps(uuid, jsonb) TO service_role;

-- ============================================================
-- Verify the functions were created correctly
-- ============================================================
SELECT 'finalize_steps column and functions updated successfully' AS status;
