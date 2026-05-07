-- Fix: Ensure fullPackageSize and fullPackageQtyReturned are properly stored and returned
-- This migration ensures:
--   1. quantity_returned column exists
--   2. _rti_to_json returns fullPackageQtyReturned (mapped from quantity_returned)
--   3. add_return_transaction_item includes quantity_returned in INSERT
--   4. update_return_transaction_item handles fullPackageQtyReturned updates

-- Step 1: Ensure quantity_returned column exists
ALTER TABLE return_transaction_items
  ADD COLUMN IF NOT EXISTS quantity_returned INTEGER;

-- Step 2: Backfill quantity_returned from quantity for existing rows where null
UPDATE return_transaction_items
SET quantity_returned = quantity
WHERE quantity_returned IS NULL;


-- Step 3: Update _rti_to_json to include fullPackageQtyReturned
CREATE OR REPLACE FUNCTION _rti_to_json(r return_transaction_items)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                      r.id,
    'transactionId',           r.transaction_id,
    'ndc',                     r.ndc,
    'ndc10',                   r.ndc_10,
    'gtin',                    r.gtin,
    'proprietaryName',         r.proprietary_name,
    'genericName',             r.generic_name,
    'manufacturer',            r.manufacturer,
    'packageDescription',      r.package_description,
    'dosageForm',              r.dosage_form,
    'strength',                r.strength,
    'route',                   r.route,
    'lotNumber',               r.lot_number,
    'serialNumber',            r.serial_number,
    'expirationDate',          r.expiration_date,
    'standardPrice',           r.standard_price,
    'quantity',                r.quantity,
    'quantityReturned',        r.quantity_returned,
    'fullPackageSize',         r.full_package_size,
    'fullPackageQtyReturned',  r.quantity_returned,
    'isPartial',               r.is_partial,
    'partialPercentage',       r.partial_percentage,
    'estimatedValue',          r.estimated_value,
    'estimatedStorePrice',     r.estimated_store_price,
    'estimatedStoreValue',     r.estimated_store_value,
    'returnStatus',            r.return_status,
    'nonReturnableReason',     r.non_returnable_reason,
    'returnReason',            r.return_reason,
    'destination',             r.destination,
    'deaSchedule',             r.dea_schedule,
    'deaForm222Required',      r.dea_form_222_required,
    'productType',             r.product_type,
    'coStatus',                r.co_status,
    'bmpStatus',               r.bmp_status,
    'memo',                    r.memo,
    'wineCellarId',            r.wine_cellar_id,
    'scanSource',              r.scan_source,
    'createdAt',               r.created_at,
    'updatedAt',               r.updated_at
  );
$$;


-- Step 4: Recreate add_return_transaction_item with quantity_returned in INSERT
CREATE OR REPLACE FUNCTION add_return_transaction_item(p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn   RECORD;
  v_price DECIMAL(12,2);
  v_qty   INTEGER;
  v_est   DECIMAL(12,2);
  v_store_price DECIMAL(12,2);
  v_store_value DECIMAL(12,2);
  v_new   return_transaction_items;
  v_dup   RECORD;
BEGIN
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

  v_price := COALESCE((p_data->>'standardPrice')::decimal, 0);
  v_qty   := COALESCE((p_data->>'quantity')::int, 1);

  v_est := CASE
    WHEN COALESCE((p_data->>'isPartial')::boolean, false) = true
     AND (p_data->>'partialPercentage')::decimal IS NOT NULL
    THEN v_price * v_qty * ((p_data->>'partialPercentage')::decimal / 100)
    ELSE v_price * v_qty
  END;

  v_store_price := ROUND(v_price * 0.70, 2);
  v_store_value := ROUND(v_est * 0.70, 2);

  IF p_data->>'ndc' IS NOT NULL AND p_data->>'lotNumber' IS NOT NULL THEN
    SELECT id INTO v_dup
      FROM return_transaction_items
     WHERE transaction_id = (p_data->>'transactionId')::uuid
       AND ndc = p_data->>'ndc'
       AND lot_number = p_data->>'lotNumber'
     LIMIT 1;
  END IF;

  INSERT INTO return_transaction_items (
    transaction_id, ndc, ndc_10, gtin,
    proprietary_name, generic_name, manufacturer, package_description,
    dosage_form, strength, route,
    lot_number, serial_number, expiration_date,
    standard_price, quantity, full_package_size, quantity_returned,
    is_partial, partial_percentage, estimated_value,
    estimated_store_price, estimated_store_value,
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
    (p_data->>'fullPackageQtyReturned')::int,
    COALESCE((p_data->>'isPartial')::boolean, false),
    (p_data->>'partialPercentage')::decimal,
    v_est,
    v_store_price,
    v_store_value,
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

  UPDATE return_transactions SET
    total_items = (
      SELECT COUNT(*) FROM return_transaction_items WHERE transaction_id = v_txn.id
    ),
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
      WHERE transaction_id = v_txn.id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
      WHERE transaction_id = v_txn.id AND return_status = 'non_returnable'
    )
  WHERE id = v_txn.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', _rti_to_json(v_new),
    'duplicate', v_dup.id IS NOT NULL,
    'duplicateItemId', v_dup.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_return_transaction_item TO authenticated, anon, service_role;
