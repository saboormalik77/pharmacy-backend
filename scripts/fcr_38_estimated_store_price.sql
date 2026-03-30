-- ============================================================
-- FCR — Add estimated_store_price to return_transaction_items
-- estimated_store_price = standard_price * 0.70 (30% less)
-- estimated_store_value = estimated_value * 0.70
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add columns
ALTER TABLE return_transaction_items
  ADD COLUMN IF NOT EXISTS estimated_store_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS estimated_store_value DECIMAL(12,2);


-- 2. Backfill existing rows
UPDATE return_transaction_items
  SET estimated_store_price = ROUND(COALESCE(standard_price, 0) * 0.70, 2),
      estimated_store_value = ROUND(COALESCE(estimated_value, 0) * 0.70, 2)
  WHERE estimated_store_price IS NULL;


-- 3. Update _rti_to_json helper to include new fields
CREATE OR REPLACE FUNCTION _rti_to_json(r return_transaction_items)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                   r.id,
    'transactionId',        r.transaction_id,
    'ndc',                  r.ndc,
    'ndc10',                r.ndc_10,
    'gtin',                 r.gtin,
    'proprietaryName',      r.proprietary_name,
    'genericName',          r.generic_name,
    'manufacturer',         r.manufacturer,
    'packageDescription',   r.package_description,
    'dosageForm',           r.dosage_form,
    'strength',             r.strength,
    'route',                r.route,
    'lotNumber',            r.lot_number,
    'serialNumber',         r.serial_number,
    'expirationDate',       r.expiration_date,
    'standardPrice',        r.standard_price,
    'quantity',             r.quantity,
    'fullPackageSize',      r.full_package_size,
    'isPartial',            r.is_partial,
    'partialPercentage',    r.partial_percentage,
    'estimatedValue',       r.estimated_value,
    'estimatedStorePrice',  r.estimated_store_price,
    'estimatedStoreValue',  r.estimated_store_value,
    'returnStatus',         r.return_status,
    'nonReturnableReason',  r.non_returnable_reason,
    'returnReason',         r.return_reason,
    'destination',          r.destination,
    'deaSchedule',          r.dea_schedule,
    'deaForm222Required',   r.dea_form_222_required,
    'productType',          r.product_type,
    'coStatus',             r.co_status,
    'bmpStatus',            r.bmp_status,
    'memo',                 r.memo,
    'wineCellarId',         r.wine_cellar_id,
    'scanSource',           r.scan_source,
    'createdAt',            r.created_at,
    'updatedAt',            r.updated_at
  );
$$;


-- 4. Update add_return_transaction_item to compute store price/value on insert
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
    standard_price, quantity, full_package_size,
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
    'data', _rti_to_json(v_new),
    'duplicate', v_dup.id IS NOT NULL,
    'duplicateItemId', v_dup.id
  );
END;
$$;


-- 5. Add columns to wine_cellar table too
ALTER TABLE wine_cellar
  ADD COLUMN IF NOT EXISTS estimated_store_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS estimated_store_value DECIMAL(12,2);

UPDATE wine_cellar
  SET estimated_store_price = ROUND(COALESCE(standard_price, 0) * 0.70, 2),
      estimated_store_value = ROUND(COALESCE(estimated_value, 0) * 0.70, 2)
  WHERE estimated_store_price IS NULL;


-- 6. Update _wc_to_json to include store fields
CREATE OR REPLACE FUNCTION _wc_to_json(r wine_cellar)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'pharmacyId',               r.pharmacy_id,
    'pharmacyName',             COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = r.pharmacy_id), ''),
    'transactionItemId',        r.transaction_item_id,
    'ndc',                      r.ndc,
    'ndc10',                    r.ndc_10,
    'productName',              r.product_name,
    'manufacturer',             r.manufacturer,
    'lotNumber',                r.lot_number,
    'serialNumber',             r.serial_number,
    'expirationDate',           r.expiration_date,
    'quantity',                 r.quantity,
    'standardPrice',            r.standard_price,
    'estimatedValue',           r.estimated_value,
    'estimatedStorePrice',      r.estimated_store_price,
    'estimatedStoreValue',      r.estimated_store_value,
    'isPartial',                r.is_partial,
    'partialPercentage',        r.partial_percentage,
    'dateShelved',              r.date_shelved,
    'expectedReturnableDate',   r.expected_returnable_date,
    'physicalLocation',         r.physical_location,
    'baggieBarcode',            r.baggie_barcode,
    'status',                   r.status,
    'returnedInTransactionId',  r.returned_in_transaction_id,
    'returnedAt',               r.returned_at,
    'notes',                    r.notes,
    'createdBy',                r.created_by,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;


-- 7. Update add_to_wine_cellar to compute store price/value
CREATE OR REPLACE FUNCTION add_to_wine_cellar(p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pharmacy_id              UUID;
  v_transaction_item_id      UUID;
  v_ndc                      VARCHAR(13);
  v_ndc_10                   VARCHAR(12);
  v_product_name             TEXT;
  v_manufacturer             TEXT;
  v_lot_number               TEXT;
  v_serial_number            TEXT;
  v_expiration_date          DATE;
  v_quantity                 INTEGER;
  v_standard_price           DECIMAL(12,2);
  v_is_partial               BOOLEAN;
  v_partial_percentage       DECIMAL(5,2);
  v_estimated_value          DECIMAL(12,2);
  v_store_price              DECIMAL(12,2);
  v_store_value              DECIMAL(12,2);
  v_expected_returnable_date DATE;
  v_physical_location        TEXT;
  v_baggie_barcode           TEXT;
  v_notes                    TEXT;
  v_created_by               UUID;
  v_new                      wine_cellar;
BEGIN
  v_pharmacy_id              := (p_data ->> 'pharmacy_id')::UUID;
  v_transaction_item_id      := (p_data ->> 'transaction_item_id')::UUID;
  v_ndc                      := p_data ->> 'ndc';
  v_ndc_10                   := p_data ->> 'ndc_10';
  v_product_name             := p_data ->> 'product_name';
  v_manufacturer             := p_data ->> 'manufacturer';
  v_lot_number               := p_data ->> 'lot_number';
  v_serial_number            := p_data ->> 'serial_number';
  v_expiration_date          := (p_data ->> 'expiration_date')::DATE;
  v_quantity                 := COALESCE((p_data ->> 'quantity')::INTEGER, 1);
  v_standard_price           := (p_data ->> 'standard_price')::DECIMAL(12,2);
  v_is_partial               := COALESCE((p_data ->> 'is_partial')::BOOLEAN, FALSE);
  v_partial_percentage       := (p_data ->> 'partial_percentage')::DECIMAL(5,2);
  v_expected_returnable_date := (p_data ->> 'expected_returnable_date')::DATE;
  v_physical_location        := p_data ->> 'physical_location';
  v_baggie_barcode           := p_data ->> 'baggie_barcode';
  v_notes                    := p_data ->> 'notes';
  v_created_by               := (p_data ->> 'created_by')::UUID;

  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = v_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  IF v_transaction_item_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM return_transaction_items WHERE id = v_transaction_item_id) THEN
      RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Transaction item not found');
    END IF;
    IF EXISTS (
      SELECT 1 FROM wine_cellar
       WHERE transaction_item_id = v_transaction_item_id
         AND status NOT IN ('destroyed')
    ) THEN
      RETURN jsonb_build_object('error', true, 'code', 409,
        'message', 'This item is already in the wine cellar');
    END IF;
  END IF;

  IF v_standard_price IS NOT NULL AND v_quantity IS NOT NULL THEN
    IF v_is_partial AND v_partial_percentage IS NOT NULL THEN
      v_estimated_value := v_standard_price * v_quantity * (v_partial_percentage / 100.0);
    ELSE
      v_estimated_value := v_standard_price * v_quantity;
    END IF;
  ELSE
    v_estimated_value := 0;
  END IF;

  v_store_price := ROUND(COALESCE(v_standard_price, 0) * 0.70, 2);
  v_store_value := ROUND(COALESCE(v_estimated_value, 0) * 0.70, 2);

  INSERT INTO wine_cellar (
    pharmacy_id, transaction_item_id,
    ndc, ndc_10, product_name, manufacturer,
    lot_number, serial_number, expiration_date,
    quantity, standard_price, estimated_value,
    estimated_store_price, estimated_store_value,
    is_partial, partial_percentage,
    expected_returnable_date, physical_location,
    baggie_barcode, notes, created_by
  ) VALUES (
    v_pharmacy_id, v_transaction_item_id,
    v_ndc, v_ndc_10, v_product_name, v_manufacturer,
    v_lot_number, v_serial_number, v_expiration_date,
    v_quantity, v_standard_price, v_estimated_value,
    v_store_price, v_store_value,
    v_is_partial, v_partial_percentage,
    v_expected_returnable_date, v_physical_location,
    v_baggie_barcode, NULLIF(TRIM(COALESCE(v_notes, '')), ''),
    v_created_by
  ) RETURNING * INTO v_new;

  RETURN jsonb_build_object('error', false, 'data', _wc_to_json(v_new));
END;
$$;


-- 8. Update update_return_transaction_item with locking + store price/value
CREATE OR REPLACE FUNCTION update_return_transaction_item(p_item_id UUID, p_updates jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_txn  RECORD;
  v_price DECIMAL;
  v_qty   INTEGER;
  v_new_status TEXT;
  v_auto_destination TEXT;
  v_is_locked BOOLEAN;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  v_is_locked := is_return_transaction_locked(v_txn.status);

  IF v_is_locked THEN
    IF (p_updates ? 'ndc') OR (p_updates ? 'ndc10')
       OR (p_updates ? 'proprietaryName') OR (p_updates ? 'genericName')
       OR (p_updates ? 'manufacturer') OR (p_updates ? 'packageDescription')
       OR (p_updates ? 'dosageForm') OR (p_updates ? 'strength') OR (p_updates ? 'route')
       OR (p_updates ? 'lotNumber') OR (p_updates ? 'serialNumber')
       OR (p_updates ? 'expirationDate') OR (p_updates ? 'standardPrice')
       OR (p_updates ? 'quantity') OR (p_updates ? 'fullPackageSize')
       OR (p_updates ? 'isPartial') OR (p_updates ? 'partialPercentage')
       OR (p_updates ? 'deaSchedule') OR (p_updates ? 'deaForm222Required') THEN
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Cannot update core item data on a "%s" return. Only classification fields (destination, return status, memo) can be updated.', v_txn.status));
    END IF;

    UPDATE return_transaction_items SET
      return_status         = COALESCE(NULLIF(TRIM(p_updates->>'returnStatus'), ''),       return_status),
      non_returnable_reason = CASE WHEN p_updates ? 'nonReturnableReason'
                                   THEN NULLIF(TRIM(p_updates->>'nonReturnableReason'), '')
                                   ELSE non_returnable_reason END,
      return_reason         = COALESCE(NULLIF(TRIM(p_updates->>'returnReason'), ''),       return_reason),
      destination           = CASE WHEN p_updates ? 'destination'
                                   THEN NULLIF(TRIM(p_updates->>'destination'), '')
                                   ELSE destination END,
      memo                  = COALESCE(NULLIF(TRIM(p_updates->>'memo'), ''),               memo),
      co_status             = COALESCE(NULLIF(TRIM(p_updates->>'coStatus'), ''),           co_status),
      bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),          bmp_status)
    WHERE id = p_item_id
    RETURNING * INTO v_item;

    UPDATE return_transactions SET
      total_returnable_value = (
        SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
        WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
      ),
      total_non_returnable_value = (
        SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
        WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
      )
    WHERE id = v_item.transaction_id;

    RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
  END IF;

  v_new_status := p_updates->>'returnStatus';
  IF v_new_status = 'returnable'
     AND NOT (p_updates ? 'destination')
     AND (v_item.destination IS NULL OR TRIM(v_item.destination) = '') THEN
    v_auto_destination := get_destination_for_ndc(v_item.ndc);
    IF v_auto_destination IS NOT NULL THEN
      p_updates := p_updates || jsonb_build_object('destination', v_auto_destination);
    END IF;
  END IF;

  UPDATE return_transaction_items SET
    ndc                   = COALESCE(NULLIF(TRIM(p_updates->>'ndc'), ''),               ndc),
    ndc_10                = COALESCE(NULLIF(TRIM(p_updates->>'ndc10'), ''),              ndc_10),
    proprietary_name      = COALESCE(NULLIF(TRIM(p_updates->>'proprietaryName'), ''),    proprietary_name),
    generic_name          = COALESCE(NULLIF(TRIM(p_updates->>'genericName'), ''),        generic_name),
    manufacturer          = COALESCE(NULLIF(TRIM(p_updates->>'manufacturer'), ''),       manufacturer),
    package_description   = COALESCE(NULLIF(TRIM(p_updates->>'packageDescription'), ''), package_description),
    dosage_form           = COALESCE(NULLIF(TRIM(p_updates->>'dosageForm'), ''),          dosage_form),
    strength              = COALESCE(NULLIF(TRIM(p_updates->>'strength'), ''),            strength),
    route                 = COALESCE(NULLIF(TRIM(p_updates->>'route'), ''),               route),
    lot_number            = COALESCE(NULLIF(TRIM(p_updates->>'lotNumber'), ''),           lot_number),
    serial_number         = COALESCE(NULLIF(TRIM(p_updates->>'serialNumber'), ''),        serial_number),
    expiration_date       = CASE WHEN p_updates ? 'expirationDate'
                                 THEN (p_updates->>'expirationDate')::date
                                 ELSE expiration_date END,
    standard_price        = CASE WHEN p_updates ? 'standardPrice'
                                 THEN (p_updates->>'standardPrice')::decimal
                                 ELSE standard_price END,
    quantity              = CASE WHEN p_updates ? 'quantity'
                                 THEN (p_updates->>'quantity')::int
                                 ELSE quantity END,
    full_package_size     = CASE WHEN p_updates ? 'fullPackageSize'
                                 THEN (p_updates->>'fullPackageSize')::int
                                 ELSE full_package_size END,
    is_partial            = CASE WHEN p_updates ? 'isPartial'
                                 THEN (p_updates->>'isPartial')::boolean
                                 ELSE is_partial END,
    partial_percentage    = CASE WHEN p_updates ? 'partialPercentage'
                                 THEN (p_updates->>'partialPercentage')::decimal
                                 ELSE partial_percentage END,
    return_status         = COALESCE(NULLIF(TRIM(p_updates->>'returnStatus'), ''),       return_status),
    non_returnable_reason = CASE WHEN p_updates ? 'nonReturnableReason'
                                 THEN NULLIF(TRIM(p_updates->>'nonReturnableReason'), '')
                                 ELSE non_returnable_reason END,
    return_reason         = COALESCE(NULLIF(TRIM(p_updates->>'returnReason'), ''),       return_reason),
    destination           = CASE WHEN p_updates ? 'destination'
                                 THEN NULLIF(TRIM(p_updates->>'destination'), '')
                                 ELSE destination END,
    dea_schedule          = COALESCE(NULLIF(TRIM(p_updates->>'deaSchedule'), ''),        dea_schedule),
    dea_form_222_required = CASE WHEN p_updates ? 'deaForm222Required'
                                 THEN (p_updates->>'deaForm222Required')::boolean
                                 ELSE dea_form_222_required END,
    memo                  = COALESCE(NULLIF(TRIM(p_updates->>'memo'), ''),               memo),
    co_status             = COALESCE(NULLIF(TRIM(p_updates->>'coStatus'), ''),           co_status),
    bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),          bmp_status)
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  v_price := COALESCE(v_item.standard_price, 0);
  v_qty   := COALESCE(v_item.quantity, 1);

  UPDATE return_transaction_items
  SET estimated_value = CASE
        WHEN is_partial = true AND partial_percentage IS NOT NULL
        THEN v_price * v_qty * (partial_percentage / 100)
        ELSE v_price * v_qty
      END,
      estimated_store_price = ROUND(v_price * 0.70, 2),
      estimated_store_value = ROUND(
        CASE
          WHEN is_partial = true AND partial_percentage IS NOT NULL
          THEN v_price * v_qty * (partial_percentage / 100)
          ELSE v_price * v_qty
        END * 0.70, 2
      )
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  UPDATE return_transactions SET
    total_items = (SELECT COUNT(*) FROM return_transaction_items WHERE transaction_id = v_item.transaction_id),
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
    )
  WHERE id = v_item.transaction_id;

  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
END;
$$;


-- 9. Update warehouse_verify_item to include store fields in response
CREATE OR REPLACE FUNCTION warehouse_verify_item(
  p_transaction_id  UUID,
  p_item_id         UUID,
  p_verified        BOOLEAN DEFAULT TRUE,
  p_actual_quantity INTEGER DEFAULT NULL,
  p_condition_notes TEXT    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn  return_transactions;
  v_item return_transaction_items;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_txn.status <> 'received' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot verify items in a return with status "%s". Must be received.', v_txn.status));
  END IF;

  SELECT * INTO v_item
    FROM return_transaction_items
   WHERE id = p_item_id AND transaction_id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Item not found in this return');
  END IF;

  UPDATE return_transaction_items SET
    verified        = p_verified,
    actual_quantity = COALESCE(p_actual_quantity, actual_quantity),
    condition_notes = COALESCE(p_condition_notes, condition_notes)
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',                  v_item.id,
      'transactionId',       v_item.transaction_id,
      'ndc',                 v_item.ndc,
      'proprietaryName',     v_item.proprietary_name,
      'genericName',         v_item.generic_name,
      'manufacturer',        v_item.manufacturer,
      'lotNumber',           v_item.lot_number,
      'expirationDate',      v_item.expiration_date,
      'quantity',            v_item.quantity,
      'actualQuantity',      v_item.actual_quantity,
      'verified',            v_item.verified,
      'conditionNotes',      v_item.condition_notes,
      'returnStatus',        v_item.return_status,
      'destination',         v_item.destination,
      'estimatedValue',      v_item.estimated_value,
      'estimatedStorePrice', v_item.estimated_store_price,
      'estimatedStoreValue', v_item.estimated_store_value
    )
  );
END;
$$;
