-- ============================================================
-- FCR Module 7 — Wine Cellar table + RPC functions
-- Run this in Supabase SQL Editor
--
-- Wine Cellar is a staging area for pharmaceutical items that
-- are currently too early for return but will become eligible
-- in the future.  Items are "shelved" with an expected
-- returnable date, then surfaced when they become eligible.
-- ============================================================


-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS wine_cellar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pharmacy link
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE RESTRICT,

  -- Original return-transaction item that was routed here (nullable)
  transaction_item_id UUID REFERENCES return_transaction_items(id) ON DELETE SET NULL,

  -- Product identification
  ndc          VARCHAR(13),
  ndc_10       VARCHAR(12),
  product_name TEXT,
  manufacturer TEXT,
  lot_number   TEXT,
  serial_number TEXT,
  expiration_date DATE,

  -- Quantity & pricing
  quantity         INTEGER NOT NULL DEFAULT 1,
  standard_price   DECIMAL(12,2),
  estimated_value  DECIMAL(12,2),
  is_partial       BOOLEAN DEFAULT FALSE,
  partial_percentage DECIMAL(5,2),

  -- Shelving info
  date_shelved             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_returnable_date DATE,
  physical_location        TEXT,   -- box label / shelf location
  baggie_barcode           TEXT,   -- barcode on the baggie

  -- Status
  status TEXT NOT NULL DEFAULT 'shelved'
    CHECK (status IN ('shelved', 'ready_to_return', 'returned', 'destroyed')),

  -- Return tracking
  returned_in_transaction_id UUID REFERENCES return_transactions(id) ON DELETE SET NULL,
  returned_at TIMESTAMPTZ,

  -- Metadata
  notes      TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wc_pharmacy         ON wine_cellar(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_wc_status           ON wine_cellar(status);
CREATE INDEX IF NOT EXISTS idx_wc_ndc              ON wine_cellar(ndc);
CREATE INDEX IF NOT EXISTS idx_wc_expiration       ON wine_cellar(expiration_date);
CREATE INDEX IF NOT EXISTS idx_wc_expected_date    ON wine_cellar(expected_returnable_date);
CREATE INDEX IF NOT EXISTS idx_wc_created_at       ON wine_cellar(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wc_transaction_item ON wine_cellar(transaction_item_id);

-- ── Auto-update trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_wine_cellar_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wine_cellar_updated_at ON wine_cellar;
CREATE TRIGGER trg_wine_cellar_updated_at
  BEFORE UPDATE ON wine_cellar
  FOR EACH ROW EXECUTE FUNCTION update_wine_cellar_updated_at();

-- ── Row-Level Security ─────────────────────────────────────────
ALTER TABLE wine_cellar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON wine_cellar;
CREATE POLICY "Allow all access via service role" ON wine_cellar
  FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- 2. HELPER: build a wine-cellar JSON object
--    Joins pharmacy_name so callers don't have to.
-- ============================================================
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


-- ============================================================
-- 3. RPC: add_to_wine_cellar
--    Validates pharmacy, checks duplicate item, calculates
--    estimated_value, inserts record.
-- ============================================================
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
  v_expected_returnable_date DATE;
  v_physical_location        TEXT;
  v_baggie_barcode           TEXT;
  v_notes                    TEXT;
  v_created_by               UUID;
  v_new                      wine_cellar;
BEGIN
  -- Extract fields from p_data
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

  -- 1. Validate pharmacy exists
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = v_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  -- 2. If transaction_item_id provided, validate it exists
  IF v_transaction_item_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM return_transaction_items WHERE id = v_transaction_item_id) THEN
      RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Transaction item not found');
    END IF;

    -- Check for duplicate: same item already in wine cellar (not destroyed)
    IF EXISTS (
      SELECT 1 FROM wine_cellar
       WHERE transaction_item_id = v_transaction_item_id
         AND status NOT IN ('destroyed')
    ) THEN
      RETURN jsonb_build_object('error', true, 'code', 409,
        'message', 'This item is already in the wine cellar');
    END IF;
  END IF;

  -- 3. Calculate estimated_value
  IF v_standard_price IS NOT NULL AND v_quantity IS NOT NULL THEN
    IF v_is_partial AND v_partial_percentage IS NOT NULL THEN
      v_estimated_value := v_standard_price * v_quantity * (v_partial_percentage / 100.0);
    ELSE
      v_estimated_value := v_standard_price * v_quantity;
    END IF;
  ELSE
    v_estimated_value := 0;
  END IF;

  -- 4. Insert
  INSERT INTO wine_cellar (
    pharmacy_id, transaction_item_id,
    ndc, ndc_10, product_name, manufacturer,
    lot_number, serial_number, expiration_date,
    quantity, standard_price, estimated_value,
    is_partial, partial_percentage,
    expected_returnable_date, physical_location,
    baggie_barcode, notes, created_by
  ) VALUES (
    v_pharmacy_id, v_transaction_item_id,
    v_ndc, v_ndc_10, v_product_name, v_manufacturer,
    v_lot_number, v_serial_number, v_expiration_date,
    v_quantity, v_standard_price, v_estimated_value,
    v_is_partial, v_partial_percentage,
    v_expected_returnable_date, v_physical_location,
    v_baggie_barcode, NULLIF(TRIM(COALESCE(v_notes, '')), ''),
    v_created_by
  ) RETURNING * INTO v_new;

  RETURN jsonb_build_object('error', false, 'data', _wc_to_json(v_new));
END;
$$;


-- ============================================================
-- 4. RPC: list_wine_cellar_items
--    Paginated listing with filters + summary stats.
-- ============================================================
CREATE OR REPLACE FUNCTION list_wine_cellar_items(
  p_pharmacy_id    UUID    DEFAULT NULL,
  p_status         TEXT    DEFAULT NULL,
  p_search         TEXT    DEFAULT NULL,
  p_expected_month TEXT    DEFAULT NULL,   -- format 'YYYY-MM'
  p_page           INT     DEFAULT 1,
  p_limit          INT     DEFAULT 50
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset         INT;
  v_total          INT;
  v_rows           jsonb;
  v_total_shelved  INT;
  v_total_ready    INT;
  v_total_value    DECIMAL(12,2);
  v_month_start    DATE;
  v_month_end      DATE;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_limit, 100);

  -- Parse expected_month filter
  IF p_expected_month IS NOT NULL AND p_expected_month <> '' THEN
    v_month_start := (p_expected_month || '-01')::DATE;
    v_month_end   := (v_month_start + INTERVAL '1 month')::DATE;
  END IF;

  -- Count total matching
  SELECT COUNT(*) INTO v_total
    FROM wine_cellar w
   WHERE (p_pharmacy_id IS NULL OR w.pharmacy_id = p_pharmacy_id)
     AND (p_status IS NULL      OR w.status = p_status)
     AND (p_search IS NULL      OR p_search = '' OR (
           w.ndc            ILIKE '%' || p_search || '%' OR
           w.product_name   ILIKE '%' || p_search || '%' OR
           w.manufacturer   ILIKE '%' || p_search || '%' OR
           w.lot_number     ILIKE '%' || p_search || '%' OR
           w.baggie_barcode ILIKE '%' || p_search || '%'
         ))
     AND (v_month_start IS NULL OR (
           w.expected_returnable_date >= v_month_start
           AND w.expected_returnable_date < v_month_end
         ));

  -- Fetch rows
  SELECT COALESCE(jsonb_agg(row_json ORDER BY date_shelved DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT _wc_to_json(w) AS row_json, w.date_shelved
        FROM wine_cellar w
       WHERE (p_pharmacy_id IS NULL OR w.pharmacy_id = p_pharmacy_id)
         AND (p_status IS NULL      OR w.status = p_status)
         AND (p_search IS NULL      OR p_search = '' OR (
               w.ndc            ILIKE '%' || p_search || '%' OR
               w.product_name   ILIKE '%' || p_search || '%' OR
               w.manufacturer   ILIKE '%' || p_search || '%' OR
               w.lot_number     ILIKE '%' || p_search || '%' OR
               w.baggie_barcode ILIKE '%' || p_search || '%'
             ))
         AND (v_month_start IS NULL OR (
               w.expected_returnable_date >= v_month_start
               AND w.expected_returnable_date < v_month_end
             ))
       ORDER BY w.date_shelved DESC
       LIMIT LEAST(p_limit, 100)
      OFFSET v_offset
    ) sub;

  -- Summary stats (across ALL matching, not just current page)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE w.status = 'shelved'), 0),
    COALESCE(COUNT(*) FILTER (WHERE w.status = 'ready_to_return'), 0),
    COALESCE(SUM(w.estimated_value) FILTER (WHERE w.status IN ('shelved', 'ready_to_return')), 0)
  INTO v_total_shelved, v_total_ready, v_total_value
    FROM wine_cellar w
   WHERE (p_pharmacy_id IS NULL OR w.pharmacy_id = p_pharmacy_id)
     AND (p_status IS NULL      OR w.status = p_status)
     AND (p_search IS NULL      OR p_search = '' OR (
           w.ndc            ILIKE '%' || p_search || '%' OR
           w.product_name   ILIKE '%' || p_search || '%' OR
           w.manufacturer   ILIKE '%' || p_search || '%' OR
           w.lot_number     ILIKE '%' || p_search || '%' OR
           w.baggie_barcode ILIKE '%' || p_search || '%'
         ))
     AND (v_month_start IS NULL OR (
           w.expected_returnable_date >= v_month_start
           AND w.expected_returnable_date < v_month_end
         ));

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'items',   v_rows,
      'summary', jsonb_build_object(
        'totalItems',   v_total,
        'totalShelved', v_total_shelved,
        'totalReady',   v_total_ready,
        'totalValue',   v_total_value
      ),
      'pagination', jsonb_build_object(
        'page',       GREATEST(p_page, 1),
        'limit',      LEAST(p_limit, 100),
        'total',      v_total,
        'totalPages', CEIL(v_total::DECIMAL / LEAST(p_limit, 100))
      )
    )
  );
END;
$$;


-- ============================================================
-- 5. RPC: get_wine_cellar_item
-- ============================================================
CREATE OR REPLACE FUNCTION get_wine_cellar_item(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_row wine_cellar;
BEGIN
  SELECT * INTO v_row FROM wine_cellar WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Wine cellar item not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'data', _wc_to_json(v_row));
END;
$$;


-- ============================================================
-- 6. RPC: update_wine_cellar_item
--    Partial update.  Blocks updates on returned / destroyed.
-- ============================================================
CREATE OR REPLACE FUNCTION update_wine_cellar_item(p_id UUID, p_updates jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row wine_cellar;
  v_recalc BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_row FROM wine_cellar WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Wine cellar item not found');
  END IF;

  IF v_row.status IN ('returned', 'destroyed') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot update item with status "%s"', v_row.status));
  END IF;

  -- Apply allowed updates
  IF p_updates ? 'physical_location' THEN
    v_row.physical_location := p_updates ->> 'physical_location';
  END IF;
  IF p_updates ? 'baggie_barcode' THEN
    v_row.baggie_barcode := p_updates ->> 'baggie_barcode';
  END IF;
  IF p_updates ? 'notes' THEN
    v_row.notes := NULLIF(TRIM(COALESCE(p_updates ->> 'notes', '')), '');
  END IF;
  IF p_updates ? 'quantity' THEN
    v_row.quantity := (p_updates ->> 'quantity')::INTEGER;
    v_recalc := TRUE;
  END IF;
  IF p_updates ? 'standard_price' THEN
    v_row.standard_price := (p_updates ->> 'standard_price')::DECIMAL(12,2);
    v_recalc := TRUE;
  END IF;
  IF p_updates ? 'expected_returnable_date' THEN
    v_row.expected_returnable_date := (p_updates ->> 'expected_returnable_date')::DATE;
  END IF;
  IF p_updates ? 'is_partial' THEN
    v_row.is_partial := (p_updates ->> 'is_partial')::BOOLEAN;
    v_recalc := TRUE;
  END IF;
  IF p_updates ? 'partial_percentage' THEN
    v_row.partial_percentage := (p_updates ->> 'partial_percentage')::DECIMAL(5,2);
    v_recalc := TRUE;
  END IF;

  -- Recalculate estimated_value if pricing/quantity changed
  IF v_recalc AND v_row.standard_price IS NOT NULL AND v_row.quantity IS NOT NULL THEN
    IF v_row.is_partial AND v_row.partial_percentage IS NOT NULL THEN
      v_row.estimated_value := v_row.standard_price * v_row.quantity * (v_row.partial_percentage / 100.0);
    ELSE
      v_row.estimated_value := v_row.standard_price * v_row.quantity;
    END IF;
  END IF;

  UPDATE wine_cellar SET
    physical_location        = v_row.physical_location,
    baggie_barcode           = v_row.baggie_barcode,
    notes                    = v_row.notes,
    quantity                 = v_row.quantity,
    standard_price           = v_row.standard_price,
    estimated_value          = v_row.estimated_value,
    expected_returnable_date = v_row.expected_returnable_date,
    is_partial               = v_row.is_partial,
    partial_percentage       = v_row.partial_percentage
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _wc_to_json(v_row));
END;
$$;


-- ============================================================
-- 7. RPC: mark_wine_cellar_returned
--    Marks a wine cellar item as returned (added back to a return).
-- ============================================================
CREATE OR REPLACE FUNCTION mark_wine_cellar_returned(
  p_id             UUID,
  p_transaction_id UUID
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row wine_cellar;
BEGIN
  SELECT * INTO v_row FROM wine_cellar WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Wine cellar item not found');
  END IF;

  IF v_row.status NOT IN ('shelved', 'ready_to_return') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot return item with status "%s". Only shelved or ready_to_return items can be returned.', v_row.status));
  END IF;

  -- Validate transaction exists if provided
  IF p_transaction_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM return_transactions WHERE id = p_transaction_id) THEN
      RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
    END IF;
  END IF;

  UPDATE wine_cellar SET
    status                     = 'returned',
    returned_in_transaction_id = p_transaction_id,
    returned_at                = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _wc_to_json(v_row));
END;
$$;


-- ============================================================
-- 8. RPC: check_and_surface_ready_items
--    Finds shelved items whose expected_returnable_date has
--    passed (or is today) and promotes them to ready_to_return.
-- ============================================================
CREATE OR REPLACE FUNCTION check_and_surface_ready_items()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_surfaced_count INT;
  v_surfaced_items jsonb;
BEGIN
  -- Update status for items whose date has come
  WITH surfaced AS (
    UPDATE wine_cellar
       SET status = 'ready_to_return'
     WHERE status = 'shelved'
       AND expected_returnable_date IS NOT NULL
       AND expected_returnable_date <= CURRENT_DATE
    RETURNING *
  )
  SELECT COUNT(*), COALESCE(jsonb_agg(_wc_to_json(s)), '[]'::jsonb)
    INTO v_surfaced_count, v_surfaced_items
    FROM surfaced s;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'surfacedCount', v_surfaced_count,
      'items',         v_surfaced_items
    )
  );
END;
$$;


-- ============================================================
-- 9. RPC: get_wine_cellar_stats
--    Returns counts by status + total value.
-- ============================================================
CREATE OR REPLACE FUNCTION get_wine_cellar_stats(
  p_pharmacy_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_total       INT;
  v_shelved     INT;
  v_ready       INT;
  v_returned    INT;
  v_destroyed   INT;
  v_total_value DECIMAL(12,2);
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'shelved'),
    COUNT(*) FILTER (WHERE status = 'ready_to_return'),
    COUNT(*) FILTER (WHERE status = 'returned'),
    COUNT(*) FILTER (WHERE status = 'destroyed'),
    COALESCE(SUM(estimated_value) FILTER (WHERE status IN ('shelved', 'ready_to_return')), 0)
  INTO v_total, v_shelved, v_ready, v_returned, v_destroyed, v_total_value
  FROM wine_cellar
  WHERE (p_pharmacy_id IS NULL OR pharmacy_id = p_pharmacy_id);

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'totalItems',    v_total,
      'shelved',       v_shelved,
      'readyToReturn', v_ready,
      'returned',      v_returned,
      'destroyed',     v_destroyed,
      'totalValue',    v_total_value
    )
  );
END;
$$;
