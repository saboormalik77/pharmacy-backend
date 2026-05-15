-- Function : warehouse_scan_box
-- Arguments: p_tracking_number text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_scan_box(p_tracking_number text) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_scan_box(p_tracking_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
