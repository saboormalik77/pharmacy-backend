-- FCR 42 — Wine Cellar rows created from add-items (too early / inverted window) without a return line
-- need a link to the return session for duplicate checks and auditing.

ALTER TABLE wine_cellar
  ADD COLUMN IF NOT EXISTS source_return_transaction_id UUID REFERENCES return_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wc_source_return_txn
  ON wine_cellar(source_return_transaction_id)
  WHERE source_return_transaction_id IS NOT NULL;

COMMENT ON COLUMN wine_cellar.source_return_transaction_id IS
  'Return the user was working in when this row was shelved without a return_transaction_items line.';

-- JSON helper: include source return id
CREATE OR REPLACE FUNCTION _wc_to_json(r wine_cellar)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'pharmacyId',               r.pharmacy_id,
    'pharmacyName',             COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = r.pharmacy_id), ''),
    'transactionItemId',        r.transaction_item_id,
    'sourceReturnTransactionId', r.source_return_transaction_id,
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

CREATE OR REPLACE FUNCTION add_to_wine_cellar(p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pharmacy_id                    UUID;
  v_transaction_item_id          UUID;
  v_source_return_transaction_id UUID;
  v_ndc                            VARCHAR(13);
  v_ndc_10                         VARCHAR(12);
  v_product_name                   TEXT;
  v_manufacturer                   TEXT;
  v_lot_number                     TEXT;
  v_serial_number                  TEXT;
  v_expiration_date                DATE;
  v_quantity                       INTEGER;
  v_standard_price                 DECIMAL(12,2);
  v_is_partial                     BOOLEAN;
  v_partial_percentage             DECIMAL(5,2);
  v_estimated_value                DECIMAL(12,2);
  v_store_price                    DECIMAL(12,2);
  v_store_value                    DECIMAL(12,2);
  v_expected_returnable_date       DATE;
  v_physical_location              TEXT;
  v_baggie_barcode                 TEXT;
  v_notes                          TEXT;
  v_created_by                     UUID;
  v_new                            wine_cellar;
BEGIN
  v_pharmacy_id                    := (p_data ->> 'pharmacy_id')::UUID;
  v_transaction_item_id            := (p_data ->> 'transaction_item_id')::UUID;
  v_source_return_transaction_id   := (p_data ->> 'source_return_transaction_id')::UUID;
  v_ndc                            := p_data ->> 'ndc';
  v_ndc_10                         := p_data ->> 'ndc_10';
  v_product_name                   := p_data ->> 'product_name';
  v_manufacturer                   := p_data ->> 'manufacturer';
  v_lot_number                     := p_data ->> 'lot_number';
  v_serial_number                  := p_data ->> 'serial_number';
  v_expiration_date                := (p_data ->> 'expiration_date')::DATE;
  v_quantity                       := COALESCE((p_data ->> 'quantity')::INTEGER, 1);
  v_standard_price                 := (p_data ->> 'standard_price')::DECIMAL(12,2);
  v_is_partial                     := COALESCE((p_data ->> 'is_partial')::BOOLEAN, FALSE);
  v_partial_percentage             := (p_data ->> 'partial_percentage')::DECIMAL(5,2);
  v_expected_returnable_date       := (p_data ->> 'expected_returnable_date')::DATE;
  v_physical_location              := p_data ->> 'physical_location';
  v_baggie_barcode                 := p_data ->> 'baggie_barcode';
  v_notes                          := p_data ->> 'notes';
  v_created_by                     := (p_data ->> 'created_by')::UUID;

  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = v_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  IF v_source_return_transaction_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM return_transactions WHERE id = v_source_return_transaction_id) THEN
      RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
    END IF;
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

  -- Same NDC+lot already shelved from this return session (no RT line path)
  IF v_transaction_item_id IS NULL
     AND v_source_return_transaction_id IS NOT NULL
     AND v_ndc IS NOT NULL AND TRIM(v_ndc) <> ''
     AND v_lot_number IS NOT NULL AND TRIM(v_lot_number) <> '' THEN
    IF EXISTS (
      SELECT 1 FROM wine_cellar
       WHERE source_return_transaction_id = v_source_return_transaction_id
         AND ndc = v_ndc AND lot_number = v_lot_number
         AND status NOT IN ('destroyed', 'returned')
    ) THEN
      RETURN jsonb_build_object('error', true, 'code', 409,
        'message', 'This product is already in the wine cellar for this return');
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
    pharmacy_id, transaction_item_id, source_return_transaction_id,
    ndc, ndc_10, product_name, manufacturer,
    lot_number, serial_number, expiration_date,
    quantity, standard_price, estimated_value,
    estimated_store_price, estimated_store_value,
    is_partial, partial_percentage,
    expected_returnable_date, physical_location,
    baggie_barcode, notes, created_by
  ) VALUES (
    v_pharmacy_id, v_transaction_item_id, v_source_return_transaction_id,
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
