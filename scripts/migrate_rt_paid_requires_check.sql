-- Migration: A memo is only "paid" if pharmacy_payments has a check_number.
-- Without a recorded check, all memos are treated as unpaid regardless of payment_status.
-- Run in Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION public._rt_to_json(rt return_transactions)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    p_info           jsonb;
    proc_info        jsonb;
    v_has_cii_items  boolean := false;
    v_has_check      boolean := false;
BEGIN
    -- Check for CII items (dea_form_222_required = true)
    SELECT EXISTS(
        SELECT 1
        FROM return_transaction_items rti
        WHERE rti.transaction_id = rt.id
          AND rti.dea_form_222_required = true
    ) INTO v_has_cii_items;

    -- Check whether a payment with a real check number exists for this batch+pharmacy
    IF rt.batch_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM pharmacy_payments pp
            WHERE pp.batch_id  = rt.batch_id
              AND pp.pharmacy_id = rt.pharmacy_id
              AND pp.check_number IS NOT NULL
        ) INTO v_has_check;
    END IF;

    -- Fetch pharmacy info if available
    SELECT jsonb_build_object(
        'id',           p.id,
        'name',         p.pharmacy_name,
        'storeNumber',  p.store_number,
        'streetAddress', (p.physical_address ->> 'address'),
        'city',         (p.physical_address ->> 'city'),
        'state',        (p.physical_address ->> 'state'),
        'lastVisitDate', p.last_visit_date
    )
    INTO p_info
    FROM pharmacy p
    WHERE p.id = rt.pharmacy_id;

    -- Fetch processor info if available (using correct column name)
    SELECT jsonb_build_object(
        'id',   pr.id,
        'name', pr.name
    )
    INTO proc_info
    FROM processors pr
    WHERE pr.id = rt.processor_id;

    -- Return the complete JSON structure
    RETURN jsonb_build_object(
        'id',                        rt.id,
        'licensePlate',              rt.license_plate,
        'pharmacyId',                rt.pharmacy_id,
        'pharmacyName',              COALESCE(p_info ->> 'name', NULL),
        'storeNumber',               COALESCE(p_info ->> 'storeNumber', NULL),
        'pharmacyStreetAddress',     COALESCE(p_info ->> 'streetAddress', NULL),
        'pharmacyCity',              COALESCE(p_info ->> 'city', NULL),
        'pharmacyState',             COALESCE(p_info ->> 'state', NULL),
        'pharmacyLastVisitDate',     COALESCE(p_info ->> 'lastVisitDate', NULL),
        'processorId',               rt.processor_id,
        'processorName',             COALESCE(proc_info ->> 'name', NULL),
        'serviceType',               rt.service_type,
        'status',                    CASE
                                        -- All memos paid/partial + check recorded = paid
                                        WHEN rt.status = 'verified'
                                          AND rt.batch_id IS NOT NULL
                                          AND v_has_check
                                          AND EXISTS (
                                                SELECT 1 FROM debit_memos dm
                                                WHERE dm.batch_id = rt.batch_id
                                                  AND dm.pharmacy_id = rt.pharmacy_id
                                              )
                                          AND NOT EXISTS (
                                                SELECT 1 FROM debit_memos dm
                                                WHERE dm.batch_id = rt.batch_id
                                                  AND dm.pharmacy_id = rt.pharmacy_id
                                                  AND dm.payment_status NOT IN ('paid', 'partial')
                                              )
                                        THEN 'paid'
                                        -- Some memos paid/partial + check recorded = partially_paid
                                        WHEN rt.status = 'verified'
                                          AND rt.batch_id IS NOT NULL
                                          AND v_has_check
                                          AND EXISTS (
                                                SELECT 1 FROM debit_memos dm
                                                WHERE dm.batch_id = rt.batch_id
                                                  AND dm.pharmacy_id = rt.pharmacy_id
                                                  AND dm.payment_status IN ('paid', 'partial')
                                              )
                                        THEN 'partially_paid'
                                        -- Verified + batch but no check (or all memos still unpaid) = not_paid
                                        WHEN rt.status = 'verified'
                                          AND rt.batch_id IS NOT NULL
                                        THEN 'not_paid'
                                        ELSE rt.status
                                     END,
        -- paidMemoCount: only when a check is recorded; otherwise 0
        'paidMemoCount',             CASE
                                        WHEN rt.batch_id IS NOT NULL AND v_has_check THEN (
                                            SELECT COUNT(*)::int FROM debit_memos dm
                                            WHERE dm.batch_id = rt.batch_id
                                              AND dm.pharmacy_id = rt.pharmacy_id
                                              AND dm.payment_status IN ('paid', 'partial')
                                        )
                                        ELSE 0
                                     END,
        -- unpaidMemoCount: when check exists, count truly unpaid; when no check, all memos are unpaid
        'unpaidMemoCount',           CASE
                                        WHEN rt.batch_id IS NOT NULL AND v_has_check THEN (
                                            SELECT COUNT(*)::int FROM debit_memos dm
                                            WHERE dm.batch_id = rt.batch_id
                                              AND dm.pharmacy_id = rt.pharmacy_id
                                              AND dm.payment_status NOT IN ('paid', 'partial')
                                        )
                                        WHEN rt.batch_id IS NOT NULL THEN (
                                            SELECT COUNT(*)::int FROM debit_memos dm
                                            WHERE dm.batch_id = rt.batch_id
                                              AND dm.pharmacy_id = rt.pharmacy_id
                                        )
                                        ELSE 0
                                     END,
        'totalAskValue',             CASE
                                        WHEN rt.batch_id IS NOT NULL THEN (
                                            SELECT COALESCE(SUM(dm.total_ask_value), 0) FROM debit_memos dm
                                            WHERE dm.batch_id = rt.batch_id
                                              AND dm.pharmacy_id = rt.pharmacy_id
                                        )
                                        ELSE 0
                                     END,
        'totalReceivedValue',        CASE
                                        WHEN rt.batch_id IS NOT NULL THEN (
                                            SELECT COALESCE(SUM(dm.total_received_value), 0) FROM debit_memos dm
                                            WHERE dm.batch_id = rt.batch_id
                                              AND dm.pharmacy_id = rt.pharmacy_id
                                        )
                                        ELSE 0
                                     END,
        'fedexTracking',             rt.fedex_tracking,
        'fedexPickupConfirmation',   rt.fedex_pickup_confirmation,
        'totalItems',                rt.total_items,
        'totalReturnableValue',      rt.total_returnable_value,
        'totalNonReturnableValue',   rt.total_non_returnable_value,
        'hasCiiItems',               v_has_cii_items,
        'batchId',                   rt.batch_id,
        'timeIn',                    rt.time_in,
        'timeOut',                   rt.time_out,
        'receivedInWarehouseDate',   rt.received_in_warehouse_date,
        'verifiedIntegrity',         rt.verified_integrity,
        'notes',                     rt.notes,
        'finalizedAt',               rt.finalized_at,
        'boxCount',                  rt.box_count,
        'manifestGeneratedAt',       rt.manifest_generated_at,
        'prpNumber',                 rt.prp_number,
        'packageTracking',           rt.package_tracking,
        'scannedPackages',           rt.scanned_packages,
        'fedexShipmentId',           rt.fedex_shipment_id,
        'fedexLabels',               rt.fedex_labels,
        'finalizeSteps',             COALESCE(rt.finalize_steps, jsonb_build_object(
                                        'printManifest', false,
                                        'fedexEntered', false,
                                        'printJobSheets', false
                                     )),
        'verifiedAt',                rt.verified_at,
        'verifiedBy',                rt.verified_by,
        'piecesReceived',            rt.pieces_received,
        'verificationCompletedAt',   rt.verification_completed_at,
        'verificationStatus',        CASE
                                        WHEN rt.verification_completed_at IS NOT NULL THEN 'completed'
                                        WHEN rt.pieces_received IS NOT NULL THEN 'in_progress'
                                        ELSE 'not_started'
                                     END,
        'createdAt',                 rt.created_at,
        'updatedAt',                 rt.updated_at
    );
END;
$function$;
