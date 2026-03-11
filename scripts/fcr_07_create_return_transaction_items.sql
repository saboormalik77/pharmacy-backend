-- ============================================================
-- FCR Module 4 — Return Transaction Items table + RPC functions
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS return_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES return_transactions(id) ON DELETE CASCADE,

  -- Product identification
  ndc VARCHAR(13),
  ndc_10 VARCHAR(12),
  gtin VARCHAR(14),
  proprietary_name TEXT,
  generic_name TEXT,
  manufacturer TEXT,
  package_description TEXT,
  dosage_form TEXT,
  strength TEXT,
  route TEXT,

  -- Scan data
  lot_number TEXT,
  serial_number TEXT,
  expiration_date DATE,

  -- Pricing & quantity
  standard_price DECIMAL(12,2),
  quantity INTEGER NOT NULL DEFAULT 1,
  full_package_size INTEGER,
  is_partial BOOLEAN DEFAULT FALSE,
  partial_percentage DECIMAL(5,2),
  estimated_value DECIMAL(12,2),

  -- Classification (set by policy engine or manual)
  return_status TEXT NOT NULL DEFAULT 'tbd'
    CHECK (return_status IN ('returnable', 'non_returnable', 'tbd')),
  non_returnable_reason TEXT
    CHECK (non_returnable_reason IS NULL OR non_returnable_reason IN ('date', 'policy', 'no_data', 'manual')),
  return_reason TEXT,
  destination TEXT
    CHECK (destination IS NULL OR destination IN ('inmar', 'qualanex', 'pharmalink', 'other')),

  -- Regulatory
  dea_schedule TEXT,
  dea_form_222_required BOOLEAN DEFAULT FALSE,
  product_type TEXT,

  -- Additional
  co_status TEXT DEFAULT 'no' CHECK (co_status IN ('yes', 'no')),
  bmp_status TEXT DEFAULT 'no' CHECK (bmp_status IN ('yes', 'no')),
  memo TEXT,
  wine_cellar_id UUID,

  -- Scan source metadata
  scan_source TEXT DEFAULT 'manual'
    CHECK (scan_source IN ('gs1_qr', 'barcode_1d', 'manual', 'ai_parsed')),
  raw_scan_data TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rti_transaction  ON return_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_rti_ndc          ON return_transaction_items(ndc);
CREATE INDEX IF NOT EXISTS idx_rti_ndc_10       ON return_transaction_items(ndc_10);
CREATE INDEX IF NOT EXISTS idx_rti_gtin         ON return_transaction_items(gtin);
CREATE INDEX IF NOT EXISTS idx_rti_lot          ON return_transaction_items(lot_number);
CREATE INDEX IF NOT EXISTS idx_rti_status       ON return_transaction_items(return_status);
CREATE INDEX IF NOT EXISTS idx_rti_expiration   ON return_transaction_items(expiration_date);

CREATE OR REPLACE FUNCTION update_rti_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rti_updated_at ON return_transaction_items;
CREATE TRIGGER trg_rti_updated_at
  BEFORE UPDATE ON return_transaction_items
  FOR EACH ROW EXECUTE FUNCTION update_rti_updated_at();

ALTER TABLE return_transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON return_transaction_items;
CREATE POLICY "Allow all access via service role" ON return_transaction_items
  FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- 2. HELPER: build an item JSON object
-- ============================================================
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


-- ============================================================
-- 3. RPC: add_return_transaction_item
-- ============================================================
CREATE OR REPLACE FUNCTION add_return_transaction_item(p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  -- 2. Check for duplicate NDC + lot in same transaction (warn, don't block)
  v_price := COALESCE((p_data->>'standardPrice')::decimal, 0);
  v_qty   := COALESCE((p_data->>'quantity')::int, 1);
  v_est   := v_price * v_qty;

  IF p_data->>'ndc' IS NOT NULL AND p_data->>'lotNumber' IS NOT NULL THEN
    SELECT id INTO v_dup
      FROM return_transaction_items
     WHERE transaction_id = (p_data->>'transactionId')::uuid
       AND ndc = p_data->>'ndc'
       AND lot_number = p_data->>'lotNumber'
     LIMIT 1;
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


-- ============================================================
-- 4. RPC: list_return_transaction_items
-- ============================================================
CREATE OR REPLACE FUNCTION list_return_transaction_items(
  p_transaction_id UUID,
  p_return_status  TEXT DEFAULT NULL,
  p_search         TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_items  jsonb;
  v_total  INT;
  v_ret_val DECIMAL;
  v_nonret_val DECIMAL;
BEGIN
  -- Verify transaction exists
  IF NOT EXISTS (SELECT 1 FROM return_transactions WHERE id = p_transaction_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  SELECT
    COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY rti.created_at DESC), '[]'::jsonb),
    COUNT(*),
    COALESCE(SUM(CASE WHEN rti.return_status = 'returnable' THEN rti.estimated_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rti.return_status = 'non_returnable' THEN rti.estimated_value ELSE 0 END), 0)
  INTO v_items, v_total, v_ret_val, v_nonret_val
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND (p_return_status IS NULL OR rti.return_status = p_return_status)
    AND (p_search IS NULL
         OR rti.ndc ILIKE '%' || p_search || '%'
         OR rti.proprietary_name ILIKE '%' || p_search || '%'
         OR rti.manufacturer ILIKE '%' || p_search || '%'
         OR rti.lot_number ILIKE '%' || p_search || '%');

  RETURN jsonb_build_object(
    'items', v_items,
    'summary', jsonb_build_object(
      'totalItems',             v_total,
      'totalReturnableValue',   v_ret_val,
      'totalNonReturnableValue', v_nonret_val,
      'totalValue',             v_ret_val + v_nonret_val
    )
  );
END;
$$;


-- ============================================================
-- 5. RPC: get_return_transaction_item
-- ============================================================
CREATE OR REPLACE FUNCTION get_return_transaction_item(p_item_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_row return_transaction_items;
BEGIN
  SELECT * INTO v_row FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;
  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_row));
END;
$$;


-- ============================================================
-- 6. RPC: update_return_transaction_item
-- ============================================================
CREATE OR REPLACE FUNCTION update_return_transaction_item(p_item_id UUID, p_updates jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_txn  RECORD;
  v_price DECIMAL;
  v_qty   INTEGER;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  IF v_txn.status IN ('finalized', 'closed_out', 'received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot update items on a finalized return');
  END IF;

  -- Apply updates (only non-null fields from p_updates)
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

  -- Recalculate estimated_value
  v_price := COALESCE(v_item.standard_price, 0);
  v_qty   := COALESCE(v_item.quantity, 1);
  UPDATE return_transaction_items SET estimated_value = v_price * v_qty WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Update transaction totals
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


-- ============================================================
-- 7. RPC: delete_return_transaction_item
-- ============================================================
CREATE OR REPLACE FUNCTION delete_return_transaction_item(p_item_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_txn  RECORD;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  IF v_txn.status IN ('finalized', 'closed_out', 'received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot delete items from a finalized return');
  END IF;

  DELETE FROM return_transaction_items WHERE id = p_item_id;

  -- Update transaction totals
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

  RETURN jsonb_build_object('error', false, 'message', 'Item deleted');
END;
$$;
