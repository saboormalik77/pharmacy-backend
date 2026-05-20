-- Function : add_return_transaction_item
-- Arguments: p_data jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.add_return_transaction_item(p_data jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.add_return_transaction_item(p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_txn   RECORD;
  v_price DECIMAL(12,2);
  v_qty   INTEGER;
  v_est   DECIMAL(12,2);
  v_new   return_transaction_items;
  v_dup   RECORD;
BEGIN
  -- 1. Verify transaction exists and is editable
  SELECT id, status INTO v_txn
    FROM return_transactions
   WHERE id = (p_data->>'transactionId')::uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  IF v_txn.status IN ('finalized', 'closed_out', 'received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot add items to a return with status "%s"', v_txn.status));
  END IF;

  -- 2. Check for duplicate NDC + lot + serial in same transaction (block if found)
  v_price := COALESCE((p_data->>'standardPrice')::decimal, 0);
  v_qty   := COALESCE((p_data->>'quantity')::int, 1);
  
  -- Calculate estimated value considering partials
  v_est := CASE 
    WHEN COALESCE((p_data->>'isPartial')::boolean, false) = true 
     AND (p_data->>'partialPercentage')::decimal IS NOT NULL 
    THEN v_price * v_qty * ((p_data->>'partialPercentage')::decimal / 100)
    ELSE v_price * v_qty 
  END;

  -- Check for duplicates based on NDC + lot number + serial number (only among returnable items)
  IF p_data->>'ndc' IS NOT NULL AND p_data->>'lotNumber' IS NOT NULL THEN
    SELECT id INTO v_dup
      FROM return_transaction_items
     WHERE transaction_id = (p_data->>'transactionId')::uuid
       AND ndc = p_data->>'ndc'
       AND lot_number = p_data->>'lotNumber'
       AND COALESCE(serial_number, '') = COALESCE(p_data->>'serialNumber', '')
       AND return_status = 'returnable'
     LIMIT 1;
     
    -- If duplicate found, return error instead of inserting
    IF v_dup.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'error', true, 
        'code', 409, 
        'message', 'Duplicate item detected: This NDC, lot number, and serial number combination already exists in this return',
        'duplicateItemId', v_dup.id
      );
    END IF;
  END IF;

  -- 3. Insert
  INSERT INTO return_transaction_items (
    transaction_id, ndc, ndc_10, gtin,
    proprietary_name, generic_name, manufacturer, package_description,
    dosage_form, strength, route,
    lot_number, serial_number, expiration_date,
    standard_price, quantity, full_package_size,
    is_partial, partial_percentage, estimated_value,
    return_status, non_returnable_reason, return_reason, destination,
    dea_schedule, dea_form_222_required, product_type,
    co_status, bmp_status, memo, scan_source, raw_scan_data
  ) VALUES (
    (p_data->>'transactionId')::uuid,
    NULLIF(TRIM(COALESCE(p_data->>'ndc','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'ndc10','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'gtin','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'proprietaryName','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'genericName','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'manufacturer','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'packageDescription','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'dosageForm','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'strength','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'route','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'lotNumber','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'serialNumber','')), ''),
    CASE WHEN p_data->>'expirationDate' IS NOT NULL
         THEN (p_data->>'expirationDate')::date ELSE NULL END,
    v_price,
    v_qty,
    (p_data->>'fullPackageSize')::int,
    COALESCE((p_data->>'isPartial')::boolean, false),
    (p_data->>'partialPercentage')::decimal,
    v_est,
    COALESCE(p_data->>'returnStatus', 'tbd'),
    NULLIF(TRIM(COALESCE(p_data->>'nonReturnableReason','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'returnReason','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'destination','')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'deaSchedule','')), ''),
    COALESCE((p_data->>'deaForm222Required')::boolean, false),
    NULLIF(TRIM(COALESCE(p_data->>'productType','')), ''),
    COALESCE(p_data->>'coStatus', 'no'),
    COALESCE(p_data->>'bmpStatus', 'no'),
    NULLIF(TRIM(COALESCE(p_data->>'memo','')), ''),
    COALESCE(p_data->>'scanSource', 'manual'),
    NULLIF(TRIM(COALESCE(p_data->>'rawScanData','')), '')
  ) RETURNING * INTO v_new;

  -- 4. Update transaction totals
  UPDATE return_transactions SET
    total_items = (
      SELECT COUNT(*) FROM return_transaction_items 
      WHERE transaction_id = v_txn.id 
      AND return_status IN ('returnable', 'tbd')
    ),
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = v_txn.id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = v_txn.id AND return_status = 'non_returnable'
    )
  WHERE id = v_txn.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', _rti_to_json(v_new)
  );
END;
$function$;
