-- ============================================================
-- FCR Module 26: Multi-Box Warehouse Receiving
-- ============================================================
-- Changes:
--   1. Add scanned_packages JSONB column to return_transactions
--   2. Update _rt_to_json to include scannedPackages
--   3. New RPC: warehouse_scan_box — scans one tracking number
--      at a time. When ALL tracking numbers for a return have
--      been scanned, the return status moves to 'received'.
--   4. Update warehouse_list_pending to also show 'scanning'
--   5. New status value 'scanning' (partially scanned)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add scanned_packages column
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS scanned_packages JSONB DEFAULT NULL;

-- Allow 'scanning' status
ALTER TABLE return_transactions
  DROP CONSTRAINT IF EXISTS return_transactions_status_check;

ALTER TABLE return_transactions
  ADD CONSTRAINT return_transactions_status_check
    CHECK (status IN (
      'in_progress', 'completed', 'finalized',
      'scanning', 'received', 'verified', 'closed'
    ));


-- ────────────────────────────────────────────────────────────
-- 2. Update _rt_to_json to include scannedPackages
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
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 3. RPC: warehouse_scan_box
--    Scans one tracking number. Looks up the return by
--    matching against ANY value in package_tracking JSONB
--    or fedex_tracking. Records the scan. If all packages
--    have been scanned → sets status = 'received'.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_scan_box(p_tracking_number TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row            return_transactions;
  v_tracking       TEXT;
  v_total_packages INTEGER;
  v_scanned        JSONB;
  v_scanned_count  INTEGER;
  v_all_scanned    BOOLEAN;
  v_key            TEXT;
  v_val            TEXT;
  v_found_key      TEXT;
BEGIN
  v_tracking := LOWER(TRIM(p_tracking_number));

  IF v_tracking IS NULL OR v_tracking = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Tracking number is required');
  END IF;

  -- Find the return: match against fedex_tracking OR any value in package_tracking
  SELECT * INTO v_row
    FROM return_transactions
   WHERE (
      LOWER(TRIM(fedex_tracking)) = v_tracking
      OR EXISTS (
        SELECT 1
          FROM jsonb_each_text(COALESCE(package_tracking, '{}'::jsonb)) kv
         WHERE LOWER(TRIM(kv.value)) = v_tracking
      )
   )
   AND status IN ('finalized', 'scanning')
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', format('No finalized return found with tracking number "%s"', TRIM(p_tracking_number)));
  END IF;

  -- Determine total expected packages
  IF v_row.package_tracking IS NOT NULL AND jsonb_typeof(v_row.package_tracking) = 'object' THEN
    SELECT COUNT(*) INTO v_total_packages
      FROM jsonb_each_text(v_row.package_tracking);
  ELSE
    v_total_packages := 1;
  END IF;

  -- Find which package key this tracking number belongs to
  v_found_key := NULL;
  IF v_row.package_tracking IS NOT NULL AND jsonb_typeof(v_row.package_tracking) = 'object' THEN
    FOR v_key, v_val IN SELECT kv.key, kv.value FROM jsonb_each_text(v_row.package_tracking) kv LOOP
      IF LOWER(TRIM(v_val)) = v_tracking THEN
        v_found_key := v_key;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- If not found in package_tracking, it's the master tracking
  IF v_found_key IS NULL THEN
    IF LOWER(TRIM(v_row.fedex_tracking)) = v_tracking THEN
      v_found_key := 'master';
    ELSE
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', 'Tracking number does not match any package in this return');
    END IF;
  END IF;

  -- Build current scanned state
  v_scanned := COALESCE(v_row.scanned_packages, '{}'::jsonb);

  -- Check if already scanned
  IF v_scanned ? v_found_key THEN
    RETURN jsonb_build_object(
      'error', false,
      'alreadyScanned', true,
      'message', format('Package "%s" (tracking %s) was already scanned', v_found_key, TRIM(p_tracking_number)),
      'data', _rt_to_json(v_row),
      'scanProgress', jsonb_build_object(
        'totalPackages', v_total_packages,
        'scannedCount', (SELECT COUNT(*) FROM jsonb_object_keys(v_scanned)),
        'allScanned', (SELECT COUNT(*) FROM jsonb_object_keys(v_scanned)) >= v_total_packages
      )
    );
  END IF;

  -- Record the scan with timestamp
  v_scanned := v_scanned || jsonb_build_object(v_found_key, NOW()::TEXT);

  -- Count scanned
  SELECT COUNT(*) INTO v_scanned_count FROM jsonb_object_keys(v_scanned);

  -- Check if all packages scanned
  v_all_scanned := v_scanned_count >= v_total_packages;

  -- Update the return
  IF v_all_scanned THEN
    UPDATE return_transactions SET
      scanned_packages           = v_scanned,
      status                     = 'received',
      received_in_warehouse_date = NOW()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    UPDATE return_transactions SET
      scanned_packages = v_scanned,
      status           = 'scanning'
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'alreadyScanned', false,
    'message', CASE
      WHEN v_all_scanned THEN 'All packages scanned! Return is now received.'
      ELSE format('Package "%s" scanned (%s of %s)', v_found_key, v_scanned_count, v_total_packages)
    END,
    'data', _rt_to_json(v_row),
    'scanProgress', jsonb_build_object(
      'totalPackages', v_total_packages,
      'scannedCount', v_scanned_count,
      'allScanned', v_all_scanned,
      'scannedKeys', (SELECT jsonb_agg(k) FROM jsonb_object_keys(v_scanned) AS k)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. Update warehouse_list_pending to include 'scanning' status
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_list_pending(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_results  jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
    FROM return_transactions rt
   WHERE rt.status IN ('finalized', 'scanning')
     AND rt.received_in_warehouse_date IS NULL
     AND (
       p_search IS NULL
       OR rt.license_plate   ILIKE '%' || p_search || '%'
       OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
       OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                  AND p.pharmacy_name ILIKE '%' || p_search || '%')
     );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _rt_to_json(rt) AS row_json, rt.created_at
        FROM return_transactions rt
       WHERE rt.status IN ('finalized', 'scanning')
         AND rt.received_in_warehouse_date IS NULL
         AND (
           p_search IS NULL
           OR rt.license_plate   ILIKE '%' || p_search || '%'
           OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
           OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                      AND p.pharmacy_name ILIKE '%' || p_search || '%')
         )
       ORDER BY rt.created_at DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page',       p_page,
      'limit',      p_limit,
      'total',      v_total,
      'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Grants
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION warehouse_scan_box       TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_list_pending   TO authenticated, anon, service_role;
