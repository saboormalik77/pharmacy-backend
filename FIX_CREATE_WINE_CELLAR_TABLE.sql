-- ============================================================
-- FIX: Create wine_cellar table and functions
-- ============================================================
-- This table stores pharmaceutical items that are too early for
-- return but will become eligible in the future.
-- ============================================================

-- 1. TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wc_pharmacy         ON wine_cellar(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_wc_status           ON wine_cellar(status);
CREATE INDEX IF NOT EXISTS idx_wc_ndc              ON wine_cellar(ndc);
CREATE INDEX IF NOT EXISTS idx_wc_expiration       ON wine_cellar(expiration_date);
CREATE INDEX IF NOT EXISTS idx_wc_expected_date    ON wine_cellar(expected_returnable_date);
CREATE INDEX IF NOT EXISTS idx_wc_created_at       ON wine_cellar(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wc_transaction_item ON wine_cellar(transaction_item_id);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_wine_cellar_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wine_cellar_updated_at ON wine_cellar;
CREATE TRIGGER trg_wine_cellar_updated_at
  BEFORE UPDATE ON wine_cellar
  FOR EACH ROW EXECUTE FUNCTION update_wine_cellar_updated_at();

-- Row-Level Security
ALTER TABLE wine_cellar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON wine_cellar;
CREATE POLICY "Allow all access via service role" ON wine_cellar
  FOR ALL USING (true) WITH CHECK (true);

-- Helper function to build wine-cellar JSON object
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

-- RPC: check_and_surface_ready_items
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

-- RPC: get_wine_cellar_stats
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

-- Grant permissions
GRANT ALL ON wine_cellar TO anon;
GRANT ALL ON wine_cellar TO authenticated;
GRANT ALL ON wine_cellar TO service_role;

GRANT EXECUTE ON FUNCTION _wc_to_json(wine_cellar) TO anon;
GRANT EXECUTE ON FUNCTION _wc_to_json(wine_cellar) TO authenticated;
GRANT EXECUTE ON FUNCTION _wc_to_json(wine_cellar) TO service_role;

GRANT EXECUTE ON FUNCTION check_and_surface_ready_items() TO anon;
GRANT EXECUTE ON FUNCTION check_and_surface_ready_items() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_surface_ready_items() TO service_role;

GRANT EXECUTE ON FUNCTION get_wine_cellar_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_wine_cellar_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wine_cellar_stats(uuid) TO service_role;

-- ============================================================
-- ✅ COMPLETED: Created wine_cellar table and functions
-- ============================================================