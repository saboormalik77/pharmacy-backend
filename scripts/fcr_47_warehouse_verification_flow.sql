-- ============================================================
-- FCR Module 47: Full Warehouse Verification Flow
-- ============================================================
-- Builds on the existing warehouse receiving (fcr_14, fcr_26).
--
-- Adds / changes:
--   1. New column on return_transaction_items: verification_status
--      (correct, damaged, missing, wrong_item) — replaces boolean 'verified'
--   2. New table: warehouse_surplus_items
--   3. New column on return_transactions: verification_completed_at
--   4. RPC: warehouse_start_verification   — records box count, sets status
--   5. RPC: warehouse_verify_item_v2       — per-item status, auto-discrepancy
--   6. RPC: warehouse_add_surplus          — surplus with location/details
--   7. RPC: warehouse_complete_verification — closes return for good items only
--   8. RPC: warehouse_resolve_discrepancy  — supervisor resolves an open discrepancy
--   9. RPC: warehouse_get_verification_summary — full snapshot for a return
--  10. RPC: warehouse_list_surplus         — list surplus for a transaction
--  11. RPC: warehouse_list_all_surplus     — paginated list across all returns
--  12. Grants
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add verification_status to return_transaction_items
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transaction_items
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT NULL
    CHECK (verification_status IS NULL OR verification_status IN (
      'correct', 'damaged', 'missing', 'wrong_item'
    ));

-- ────────────────────────────────────────────────────────────
-- 2. Add verification_completed_at to return_transactions
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMPTZ DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. warehouse_surplus_items table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_surplus_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      UUID NOT NULL REFERENCES return_transactions(id) ON DELETE CASCADE,
  ndc                 VARCHAR(13),
  product_name        TEXT,
  manufacturer        TEXT,
  lot_number          TEXT,
  expiration_date     DATE,
  quantity            INTEGER NOT NULL DEFAULT 1,
  warehouse_location  TEXT NOT NULL,
  condition           TEXT DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'unknown')),
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'stored'
    CHECK (status IN ('stored', 'assigned_to_return', 'disposed', 'other')),
  assigned_return_id  UUID REFERENCES return_transactions(id) ON DELETE SET NULL,
  reported_by         UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wsi_transaction ON warehouse_surplus_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_wsi_status      ON warehouse_surplus_items(status);

CREATE OR REPLACE FUNCTION update_warehouse_surplus_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_warehouse_surplus_items_updated_at ON warehouse_surplus_items;
CREATE TRIGGER trg_warehouse_surplus_items_updated_at
  BEFORE UPDATE ON warehouse_surplus_items
  FOR EACH ROW EXECUTE FUNCTION update_warehouse_surplus_items_updated_at();

ALTER TABLE warehouse_surplus_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role on surplus" ON warehouse_surplus_items;
CREATE POLICY "Allow all access via service role on surplus" ON warehouse_surplus_items
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 4. RPC: warehouse_start_verification
--    Called when a user picks a received return to begin
--    the verification flow. Records the physical box count.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_start_verification(
  p_transaction_id  UUID,
  p_box_count       INTEGER,
  p_verified_by     UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn          return_transactions;
  v_expected_box INTEGER;
  v_total_items  INTEGER;
  v_box_match    BOOLEAN;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_txn.status NOT IN ('received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot start verification for status "%s". Must be received.', v_txn.status));
  END IF;

  IF p_box_count IS NULL OR p_box_count < 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Box count must be a non-negative integer');
  END IF;

  v_expected_box := COALESCE(v_txn.box_count, 0);
  v_box_match    := (p_box_count = v_expected_box) OR (v_expected_box = 0);

  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_transaction_id;

  -- Record the box count + start verification
  UPDATE return_transactions SET
    pieces_received    = p_box_count,
    verified_by        = COALESCE(p_verified_by, verified_by),
    verified_at        = NOW()
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  -- If box counts don't match, auto-create a discrepancy
  IF NOT v_box_match THEN
    INSERT INTO warehouse_discrepancies (
      transaction_id, type, expected_quantity, actual_quantity,
      notes, reported_by
    ) VALUES (
      p_transaction_id, 'other', v_expected_box, p_box_count,
      format('Box count mismatch: expected %s, received %s', v_expected_box, p_box_count),
      p_verified_by
    );
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction',    _rt_to_json(v_txn),
      'expectedBoxes',  v_expected_box,
      'receivedBoxes',  p_box_count,
      'boxCountMatch',  v_box_match,
      'totalItems',     v_total_items
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. RPC: warehouse_verify_item_v2
--    Replaces the old boolean approach with a proper status:
--    correct / damaged / missing / wrong_item.
--    Auto-creates a discrepancy for damaged/missing/wrong.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_verify_item_v2(
  p_transaction_id      UUID,
  p_item_id             UUID,
  p_verification_status TEXT,
  p_actual_quantity     INTEGER DEFAULT NULL,
  p_condition_notes     TEXT    DEFAULT NULL,
  p_reported_by         UUID   DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn   return_transactions;
  v_item  return_transaction_items;
  v_disc  warehouse_discrepancies;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_txn.status NOT IN ('received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot verify items for status "%s". Must be received.', v_txn.status));
  END IF;

  IF p_verification_status NOT IN ('correct', 'damaged', 'missing', 'wrong_item') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'verification_status must be: correct, damaged, missing, or wrong_item');
  END IF;

  SELECT * INTO v_item
    FROM return_transaction_items
   WHERE id = p_item_id AND transaction_id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Item not found in this return');
  END IF;

  -- Update the item
  UPDATE return_transaction_items SET
    verified            = (p_verification_status = 'correct'),
    verification_status = p_verification_status,
    actual_quantity     = COALESCE(p_actual_quantity, actual_quantity),
    condition_notes     = COALESCE(p_condition_notes, condition_notes)
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Auto-create discrepancy for non-correct items
  IF p_verification_status IN ('damaged', 'missing', 'wrong_item') THEN
    INSERT INTO warehouse_discrepancies (
      transaction_id, item_id, type, ndc, product_name,
      expected_quantity, actual_quantity, notes, reported_by
    ) VALUES (
      p_transaction_id,
      p_item_id,
      CASE p_verification_status
        WHEN 'damaged'    THEN 'damaged'
        WHEN 'missing'    THEN 'missing'
        WHEN 'wrong_item' THEN 'other'
      END,
      v_item.ndc,
      COALESCE(v_item.proprietary_name, v_item.generic_name),
      v_item.quantity,
      p_actual_quantity,
      COALESCE(p_condition_notes, format('Item marked as %s during verification', p_verification_status)),
      p_reported_by
    ) RETURNING * INTO v_disc;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',                 v_item.id,
      'transactionId',      v_item.transaction_id,
      'ndc',                v_item.ndc,
      'proprietaryName',    v_item.proprietary_name,
      'genericName',        v_item.generic_name,
      'manufacturer',       v_item.manufacturer,
      'lotNumber',          v_item.lot_number,
      'expirationDate',     v_item.expiration_date,
      'quantity',           v_item.quantity,
      'actualQuantity',     v_item.actual_quantity,
      'verified',           v_item.verified,
      'verificationStatus', v_item.verification_status,
      'conditionNotes',     v_item.condition_notes,
      'returnStatus',       v_item.return_status,
      'destination',        v_item.destination,
      'estimatedValue',     v_item.estimated_value,
      'discrepancyId',      CASE WHEN v_disc.id IS NOT NULL THEN v_disc.id ELSE NULL END
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RPC: warehouse_add_surplus
--    Records extra items that were not on the return list.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_add_surplus(
  p_transaction_id     UUID,
  p_ndc                TEXT    DEFAULT NULL,
  p_product_name       TEXT    DEFAULT NULL,
  p_manufacturer       TEXT    DEFAULT NULL,
  p_lot_number         TEXT    DEFAULT NULL,
  p_expiration_date    DATE    DEFAULT NULL,
  p_quantity           INTEGER DEFAULT 1,
  p_warehouse_location TEXT    DEFAULT NULL,
  p_condition          TEXT    DEFAULT 'good',
  p_notes              TEXT    DEFAULT NULL,
  p_reported_by        UUID    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn     return_transactions;
  v_surplus warehouse_surplus_items;
  v_disc    warehouse_discrepancies;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF p_warehouse_location IS NULL OR TRIM(p_warehouse_location) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Warehouse location is required for surplus items');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Quantity must be at least 1');
  END IF;

  IF p_condition NOT IN ('good', 'damaged', 'unknown') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Condition must be: good, damaged, or unknown');
  END IF;

  -- Create surplus record
  INSERT INTO warehouse_surplus_items (
    transaction_id, ndc, product_name, manufacturer,
    lot_number, expiration_date, quantity,
    warehouse_location, condition, notes, reported_by
  ) VALUES (
    p_transaction_id, p_ndc, p_product_name, p_manufacturer,
    p_lot_number, p_expiration_date, p_quantity,
    TRIM(p_warehouse_location), p_condition, p_notes, p_reported_by
  ) RETURNING * INTO v_surplus;

  -- Also create an 'extra' discrepancy so it shows in the discrepancy report
  INSERT INTO warehouse_discrepancies (
    transaction_id, type, ndc, product_name,
    expected_quantity, actual_quantity, notes, reported_by
  ) VALUES (
    p_transaction_id, 'extra', p_ndc, p_product_name,
    0, p_quantity,
    format('Surplus: %s (qty %s) stored at %s. %s',
      COALESCE(p_product_name, p_ndc, 'Unknown product'),
      p_quantity,
      TRIM(p_warehouse_location),
      COALESCE(p_notes, '')),
    p_reported_by
  ) RETURNING * INTO v_disc;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',                v_surplus.id,
      'transactionId',     v_surplus.transaction_id,
      'ndc',               v_surplus.ndc,
      'productName',       v_surplus.product_name,
      'manufacturer',      v_surplus.manufacturer,
      'lotNumber',         v_surplus.lot_number,
      'expirationDate',    v_surplus.expiration_date,
      'quantity',          v_surplus.quantity,
      'warehouseLocation', v_surplus.warehouse_location,
      'condition',         v_surplus.condition,
      'notes',             v_surplus.notes,
      'status',            v_surplus.status,
      'reportedBy',        v_surplus.reported_by,
      'createdAt',         v_surplus.created_at,
      'discrepancyId',     v_disc.id
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. RPC: warehouse_complete_verification
--    Closes the return for the GOOD items only.
--    Damaged/missing items are excluded from the completed return.
--    Surplus items remain in the warehouse (not part of this return).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_complete_verification(
  p_transaction_id UUID,
  p_notes          TEXT DEFAULT NULL,
  p_verified_by    UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn               return_transactions;
  v_total_items       INTEGER;
  v_verified_count    INTEGER;
  v_correct_count     INTEGER;
  v_damaged_count     INTEGER;
  v_missing_count     INTEGER;
  v_wrong_count       INTEGER;
  v_unverified_count  INTEGER;
  v_surplus_count     INTEGER;
  v_open_disc         INTEGER;
  v_correct_value     DECIMAL(12,2);
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_txn.status NOT IN ('received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot complete verification for status "%s". Must be received.', v_txn.status));
  END IF;

  -- Count items by status
  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_verified_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status IS NOT NULL;

  SELECT COUNT(*) INTO v_correct_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'correct';

  SELECT COUNT(*) INTO v_damaged_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'damaged';

  SELECT COUNT(*) INTO v_missing_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'missing';

  SELECT COUNT(*) INTO v_wrong_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'wrong_item';

  v_unverified_count := v_total_items - v_verified_count;

  -- Block if there are unverified items
  IF v_unverified_count > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('%s item(s) have not been verified yet. Please verify all items before completing.', v_unverified_count));
  END IF;

  -- Count surplus and open discrepancies
  SELECT COUNT(*) INTO v_surplus_count
    FROM warehouse_surplus_items WHERE transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_open_disc
    FROM warehouse_discrepancies WHERE transaction_id = p_transaction_id AND status = 'open';

  -- Calculate value of correct items only
  SELECT COALESCE(SUM(estimated_value), 0) INTO v_correct_value
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'correct';

  -- Mark the return as verified / completed
  UPDATE return_transactions SET
    status                    = 'verified',
    verified_integrity        = (v_damaged_count = 0 AND v_missing_count = 0 AND v_wrong_count = 0),
    verification_completed_at = NOW(),
    verified_at               = COALESCE(verified_at, NOW()),
    verified_by               = COALESCE(p_verified_by, verified_by),
    notes                     = COALESCE(p_notes, notes)
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction',   _rt_to_json(v_txn),
      'summary', jsonb_build_object(
        'totalItems',        v_total_items,
        'correctItems',      v_correct_count,
        'damagedItems',      v_damaged_count,
        'missingItems',      v_missing_count,
        'wrongItems',        v_wrong_count,
        'surplusItems',      v_surplus_count,
        'openDiscrepancies', v_open_disc,
        'correctItemsValue', v_correct_value,
        'allItemsIntact',    (v_damaged_count = 0 AND v_missing_count = 0 AND v_wrong_count = 0)
      )
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. RPC: warehouse_resolve_discrepancy
--    Supervisor resolves or dismisses an open discrepancy.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_resolve_discrepancy(
  p_discrepancy_id   UUID,
  p_resolution       TEXT,
  p_resolution_notes TEXT    DEFAULT NULL,
  p_resolved_by      UUID   DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_disc warehouse_discrepancies;
BEGIN
  SELECT * INTO v_disc FROM warehouse_discrepancies WHERE id = p_discrepancy_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Discrepancy not found');
  END IF;

  IF v_disc.status <> 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Discrepancy is already %s', v_disc.status));
  END IF;

  IF p_resolution NOT IN ('resolved', 'dismissed') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Resolution must be: resolved or dismissed');
  END IF;

  UPDATE warehouse_discrepancies SET
    status           = p_resolution,
    resolution_notes = p_resolution_notes,
    resolved_by      = p_resolved_by,
    resolved_at      = NOW()
  WHERE id = p_discrepancy_id
  RETURNING * INTO v_disc;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',              v_disc.id,
      'transactionId',   v_disc.transaction_id,
      'itemId',          v_disc.item_id,
      'type',            v_disc.type,
      'ndc',             v_disc.ndc,
      'productName',     v_disc.product_name,
      'expectedQuantity',v_disc.expected_quantity,
      'actualQuantity',  v_disc.actual_quantity,
      'notes',           v_disc.notes,
      'status',          v_disc.status,
      'resolutionNotes', v_disc.resolution_notes,
      'resolvedBy',      v_disc.resolved_by,
      'resolvedAt',      v_disc.resolved_at,
      'createdAt',       v_disc.created_at
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. RPC: warehouse_get_verification_summary
--    Full snapshot of a verification session for a return.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_get_verification_summary(p_transaction_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn             return_transactions;
  v_items           jsonb;
  v_total_items     INTEGER;
  v_correct         INTEGER;
  v_damaged         INTEGER;
  v_missing         INTEGER;
  v_wrong           INTEGER;
  v_unverified      INTEGER;
  v_surplus         jsonb;
  v_surplus_count   INTEGER;
  v_discrepancies   jsonb;
  v_disc_open       INTEGER;
  v_disc_total      INTEGER;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Items with verification status
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                 rti.id,
      'ndc',                rti.ndc,
      'proprietaryName',    rti.proprietary_name,
      'genericName',        rti.generic_name,
      'manufacturer',       rti.manufacturer,
      'lotNumber',          rti.lot_number,
      'expirationDate',     rti.expiration_date,
      'quantity',           rti.quantity,
      'actualQuantity',     rti.actual_quantity,
      'verified',           rti.verified,
      'verificationStatus', rti.verification_status,
      'conditionNotes',     rti.condition_notes,
      'returnStatus',       rti.return_status,
      'estimatedValue',     rti.estimated_value
    ) ORDER BY rti.created_at
  ), '[]'::jsonb)
  INTO v_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_transaction_id;
  SELECT COUNT(*) INTO v_correct
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'correct';
  SELECT COUNT(*) INTO v_damaged
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'damaged';
  SELECT COUNT(*) INTO v_missing
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'missing';
  SELECT COUNT(*) INTO v_wrong
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'wrong_item';
  v_unverified := v_total_items - v_correct - v_damaged - v_missing - v_wrong;

  -- Surplus
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                wsi.id,
      'ndc',               wsi.ndc,
      'productName',       wsi.product_name,
      'manufacturer',      wsi.manufacturer,
      'lotNumber',         wsi.lot_number,
      'expirationDate',    wsi.expiration_date,
      'quantity',          wsi.quantity,
      'warehouseLocation', wsi.warehouse_location,
      'condition',         wsi.condition,
      'notes',             wsi.notes,
      'status',            wsi.status,
      'createdAt',         wsi.created_at
    ) ORDER BY wsi.created_at
  ), '[]'::jsonb), COUNT(*)
  INTO v_surplus, v_surplus_count
  FROM warehouse_surplus_items wsi
  WHERE wsi.transaction_id = p_transaction_id;

  -- Discrepancies
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               wd.id,
      'itemId',           wd.item_id,
      'type',             wd.type,
      'ndc',              wd.ndc,
      'productName',      wd.product_name,
      'expectedQuantity', wd.expected_quantity,
      'actualQuantity',   wd.actual_quantity,
      'notes',            wd.notes,
      'status',           wd.status,
      'resolutionNotes',  wd.resolution_notes,
      'resolvedBy',       wd.resolved_by,
      'resolvedAt',       wd.resolved_at,
      'createdAt',        wd.created_at
    ) ORDER BY wd.created_at DESC
  ), '[]'::jsonb), COUNT(*),
  COUNT(*) FILTER (WHERE wd.status = 'open')
  INTO v_discrepancies, v_disc_total, v_disc_open
  FROM warehouse_discrepancies wd
  WHERE wd.transaction_id = p_transaction_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction', _rt_to_json(v_txn),
      'items',       v_items,
      'counts', jsonb_build_object(
        'totalItems',    v_total_items,
        'correct',       v_correct,
        'damaged',       v_damaged,
        'missing',       v_missing,
        'wrongItem',     v_wrong,
        'unverified',    v_unverified,
        'surplus',       v_surplus_count
      ),
      'surplus',        v_surplus,
      'discrepancies',  v_discrepancies,
      'discrepancyCounts', jsonb_build_object(
        'total', v_disc_total,
        'open',  v_disc_open
      )
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 10. RPC: warehouse_list_surplus
--     List surplus items for a specific transaction.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_list_surplus(
  p_transaction_id UUID,
  p_status         TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_results jsonb;
  v_total   INTEGER;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                wsi.id,
      'transactionId',     wsi.transaction_id,
      'ndc',               wsi.ndc,
      'productName',       wsi.product_name,
      'manufacturer',      wsi.manufacturer,
      'lotNumber',         wsi.lot_number,
      'expirationDate',    wsi.expiration_date,
      'quantity',          wsi.quantity,
      'warehouseLocation', wsi.warehouse_location,
      'condition',         wsi.condition,
      'notes',             wsi.notes,
      'status',            wsi.status,
      'assignedReturnId',  wsi.assigned_return_id,
      'reportedBy',        wsi.reported_by,
      'createdAt',         wsi.created_at
    ) ORDER BY wsi.created_at DESC
  ), '[]'::jsonb), COUNT(*)
  INTO v_results, v_total
  FROM warehouse_surplus_items wsi
  WHERE wsi.transaction_id = p_transaction_id
    AND (p_status IS NULL OR wsi.status = p_status);

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'total', v_total
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 11. RPC: warehouse_list_all_surplus
--     Paginated list of all surplus items across all returns.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION warehouse_list_all_surplus(
  p_status  TEXT    DEFAULT NULL,
  p_search  TEXT    DEFAULT NULL,
  p_page    INTEGER DEFAULT 1,
  p_limit   INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM warehouse_surplus_items wsi
  WHERE (p_status IS NULL OR wsi.status = p_status)
    AND (p_search IS NULL
      OR wsi.product_name ILIKE '%' || p_search || '%'
      OR wsi.ndc ILIKE '%' || p_search || '%'
      OR wsi.warehouse_location ILIKE '%' || p_search || '%'
    );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_results
  FROM (
    SELECT jsonb_build_object(
      'id',                wsi.id,
      'transactionId',     wsi.transaction_id,
      'licensePlate',      (SELECT license_plate FROM return_transactions WHERE id = wsi.transaction_id),
      'pharmacyName',      (SELECT pharmacy_name FROM pharmacy WHERE id = (
                              SELECT pharmacy_id FROM return_transactions WHERE id = wsi.transaction_id
                           )),
      'ndc',               wsi.ndc,
      'productName',       wsi.product_name,
      'manufacturer',      wsi.manufacturer,
      'lotNumber',         wsi.lot_number,
      'expirationDate',    wsi.expiration_date,
      'quantity',          wsi.quantity,
      'warehouseLocation', wsi.warehouse_location,
      'condition',         wsi.condition,
      'notes',             wsi.notes,
      'status',            wsi.status,
      'assignedReturnId',  wsi.assigned_return_id,
      'createdAt',         wsi.created_at
    ) AS row_json, wsi.created_at
    FROM warehouse_surplus_items wsi
    WHERE (p_status IS NULL OR wsi.status = p_status)
      AND (p_search IS NULL
        OR wsi.product_name ILIKE '%' || p_search || '%'
        OR wsi.ndc ILIKE '%' || p_search || '%'
        OR wsi.warehouse_location ILIKE '%' || p_search || '%'
      )
    ORDER BY wsi.created_at DESC
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
-- 12. Grants
-- ────────────────────────────────────────────────────────────
GRANT ALL ON warehouse_surplus_items TO service_role;
GRANT EXECUTE ON FUNCTION warehouse_start_verification(UUID, INTEGER, UUID)                   TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_verify_item_v2(UUID, UUID, TEXT, INTEGER, TEXT, UUID)      TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_add_surplus(UUID, TEXT, TEXT, TEXT, TEXT, DATE, INTEGER, TEXT, TEXT, TEXT, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_complete_verification(UUID, TEXT, UUID)                    TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_resolve_discrepancy(UUID, TEXT, TEXT, UUID)                TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_get_verification_summary(UUID)                            TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_list_surplus(UUID, TEXT)                                   TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION warehouse_list_all_surplus(TEXT, TEXT, INTEGER, INTEGER)             TO authenticated, anon, service_role;
