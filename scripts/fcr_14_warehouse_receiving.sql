-- ============================================================
-- FCR Module 9: Warehouse Receiving
-- ============================================================
-- Adds:
--   1. New columns on return_transactions (verified_at, verified_by, pieces_received)
--   2. New columns on return_transaction_items (verified, actual_quantity, condition_notes)
--   3. warehouse_discrepancies table
--   4. Updated _rt_to_json helper
--   5. RPC: warehouse_receive_return
--   6. RPC: warehouse_list_pending
--   7. RPC: warehouse_list_received
--   8. RPC: warehouse_verify_return
--   9. RPC: warehouse_verify_item
--  10. RPC: warehouse_report_discrepancy
--  11. RPC: warehouse_list_discrepancies
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add columns to return_transactions for verification
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS verified_at          TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by          UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pieces_received      INTEGER     DEFAULT NULL;


-- ────────────────────────────────────────────────────────────
-- 2. Add per-item verification columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transaction_items
  ADD COLUMN IF NOT EXISTS verified        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS actual_quantity  INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS condition_notes  TEXT    DEFAULT NULL;


-- ────────────────────────────────────────────────────────────
-- 3. Create warehouse_discrepancies table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_discrepancies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      UUID NOT NULL REFERENCES return_transactions(id) ON DELETE CASCADE,
  item_id             UUID REFERENCES return_transaction_items(id) ON DELETE SET NULL,
  type                TEXT NOT NULL CHECK (type IN ('missing', 'extra', 'damaged', 'wrong_store', 'other')),
  ndc                 VARCHAR(13),
  product_name        TEXT,
  expected_quantity   INTEGER,
  actual_quantity     INTEGER,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by         UUID,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  reported_by         UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wd_transaction ON warehouse_discrepancies(transaction_id);
CREATE INDEX IF NOT EXISTS idx_wd_status      ON warehouse_discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_wd_type        ON warehouse_discrepancies(type);

CREATE OR REPLACE FUNCTION update_warehouse_discrepancies_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_warehouse_discrepancies_updated_at ON warehouse_discrepancies;
CREATE TRIGGER trg_warehouse_discrepancies_updated_at
  BEFORE UPDATE ON warehouse_discrepancies
  FOR EACH ROW EXECUTE FUNCTION update_warehouse_discrepancies_updated_at();

ALTER TABLE warehouse_discrepancies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON warehouse_discrepancies;
CREATE POLICY "Allow all access via service role" ON warehouse_discrepancies
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 4. Update _rt_to_json to include new columns
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
    'verifiedAt',               r.verified_at,
    'verifiedBy',               r.verified_by,
    'piecesReceived',           r.pieces_received,
    'notes',                    r.notes,
    'finalizedAt',              r.finalized_at,
    'boxCount',                 r.box_count,
    'manifestGeneratedAt',      r.manifest_generated_at,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 5. RPC: warehouse_receive_return
--    Finds return by fedex_tracking, sets received date & status
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_receive_return(p_fedex_tracking TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  IF p_fedex_tracking IS NULL OR TRIM(p_fedex_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'FedEx tracking number is required');
  END IF;

  SELECT * INTO v_row
    FROM return_transactions
   WHERE LOWER(TRIM(fedex_tracking)) = LOWER(TRIM(p_fedex_tracking));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', format('No return found with tracking number "%s"', TRIM(p_fedex_tracking)));
  END IF;

  IF v_row.status NOT IN ('finalized') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Return has status "%s". Only finalized returns can be received.', v_row.status));
  END IF;

  IF v_row.received_in_warehouse_date IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'This return has already been received in the warehouse.');
  END IF;

  UPDATE return_transactions SET
    status                      = 'received',
    received_in_warehouse_date  = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RPC: warehouse_list_pending
--    Returns finalized but not yet received returns
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
   WHERE rt.status = 'finalized'
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
       WHERE rt.status = 'finalized'
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
-- 7. RPC: warehouse_list_received
--    Returns received but not yet fully verified returns
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_list_received(
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
   WHERE rt.status = 'received'
     AND (
       p_search IS NULL
       OR rt.license_plate   ILIKE '%' || p_search || '%'
       OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
       OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                  AND p.pharmacy_name ILIKE '%' || p_search || '%')
     );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY received_in_warehouse_date DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _rt_to_json(rt) AS row_json, rt.received_in_warehouse_date
        FROM return_transactions rt
       WHERE rt.status = 'received'
         AND (
           p_search IS NULL
           OR rt.license_plate   ILIKE '%' || p_search || '%'
           OR rt.fedex_tracking  ILIKE '%' || p_search || '%'
           OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = rt.pharmacy_id
                      AND p.pharmacy_name ILIKE '%' || p_search || '%')
         )
       ORDER BY rt.received_in_warehouse_date DESC
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
-- 8. RPC: warehouse_verify_return
--    Marks an entire return as verified
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_verify_return(
  p_id                  UUID,
  p_pieces_received     INTEGER DEFAULT NULL,
  p_verified_integrity  BOOLEAN DEFAULT TRUE,
  p_notes               TEXT    DEFAULT NULL,
  p_verified_by         UUID    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row            return_transactions;
  v_total_items    INTEGER;
  v_verified_items INTEGER;
  v_discrepancies  INTEGER;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_row.status <> 'received' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot verify a return with status "%s". Must be received first.', v_row.status));
  END IF;

  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_id;

  SELECT COUNT(*) INTO v_verified_items
    FROM return_transaction_items WHERE transaction_id = p_id AND verified = TRUE;

  SELECT COUNT(*) INTO v_discrepancies
    FROM warehouse_discrepancies WHERE transaction_id = p_id AND status = 'open';

  UPDATE return_transactions SET
    verified_integrity  = p_verified_integrity,
    verified_at         = NOW(),
    verified_by         = p_verified_by,
    pieces_received     = COALESCE(p_pieces_received, pieces_received),
    notes               = COALESCE(p_notes, notes)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'error', false,
    'data', _rt_to_json(v_row),
    'verification', jsonb_build_object(
      'totalItems',     v_total_items,
      'verifiedItems',  v_verified_items,
      'openDiscrepancies', v_discrepancies
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. RPC: warehouse_verify_item
--    Verifies a single item within a received return
-- ────────────────────────────────────────────────────────────
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
      'id',             v_item.id,
      'transactionId',  v_item.transaction_id,
      'ndc',            v_item.ndc,
      'proprietaryName',v_item.proprietary_name,
      'genericName',    v_item.generic_name,
      'manufacturer',   v_item.manufacturer,
      'lotNumber',      v_item.lot_number,
      'expirationDate', v_item.expiration_date,
      'quantity',       v_item.quantity,
      'actualQuantity', v_item.actual_quantity,
      'verified',       v_item.verified,
      'conditionNotes', v_item.condition_notes,
      'returnStatus',   v_item.return_status,
      'destination',    v_item.destination,
      'estimatedValue', v_item.estimated_value
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 10. RPC: warehouse_report_discrepancy
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_report_discrepancy(
  p_transaction_id    UUID,
  p_type              TEXT,
  p_item_id           UUID    DEFAULT NULL,
  p_ndc               TEXT    DEFAULT NULL,
  p_product_name      TEXT    DEFAULT NULL,
  p_expected_quantity INTEGER DEFAULT NULL,
  p_actual_quantity   INTEGER DEFAULT NULL,
  p_notes             TEXT    DEFAULT NULL,
  p_reported_by       UUID    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn  return_transactions;
  v_disc warehouse_discrepancies;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF p_type NOT IN ('missing', 'extra', 'damaged', 'wrong_store', 'other') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Invalid discrepancy type "%s". Must be: missing, extra, damaged, wrong_store, other', p_type));
  END IF;

  INSERT INTO warehouse_discrepancies (
    transaction_id, item_id, type, ndc, product_name,
    expected_quantity, actual_quantity, notes, reported_by
  ) VALUES (
    p_transaction_id, p_item_id, p_type, p_ndc, p_product_name,
    p_expected_quantity, p_actual_quantity, p_notes, p_reported_by
  ) RETURNING * INTO v_disc;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',               v_disc.id,
      'transactionId',    v_disc.transaction_id,
      'itemId',           v_disc.item_id,
      'type',             v_disc.type,
      'ndc',              v_disc.ndc,
      'productName',      v_disc.product_name,
      'expectedQuantity', v_disc.expected_quantity,
      'actualQuantity',   v_disc.actual_quantity,
      'notes',            v_disc.notes,
      'status',           v_disc.status,
      'reportedBy',       v_disc.reported_by,
      'createdAt',        v_disc.created_at
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 11. RPC: warehouse_list_discrepancies
--     List discrepancies for a given return transaction
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_list_discrepancies(
  p_transaction_id UUID,
  p_status         TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_results jsonb;
  v_total   INTEGER;
BEGIN
  SELECT COUNT(*), COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               wd.id,
      'transactionId',    wd.transaction_id,
      'itemId',           wd.item_id,
      'type',             wd.type,
      'ndc',              wd.ndc,
      'productName',      wd.product_name,
      'expectedQuantity', wd.expected_quantity,
      'actualQuantity',   wd.actual_quantity,
      'notes',            wd.notes,
      'status',           wd.status,
      'reportedBy',       wd.reported_by,
      'resolvedBy',       wd.resolved_by,
      'resolvedAt',       wd.resolved_at,
      'resolutionNotes',  wd.resolution_notes,
      'createdAt',        wd.created_at
    ) ORDER BY wd.created_at DESC
  ), '[]'::jsonb)
  INTO v_total, v_results
  FROM warehouse_discrepancies wd
  WHERE wd.transaction_id = p_transaction_id
    AND (p_status IS NULL OR wd.status = p_status);

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'total', v_total
  );
END;
$$;
