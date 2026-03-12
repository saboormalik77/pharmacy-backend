-- ============================================================
-- FCR Module 10: Monthly Batch & Close-Out
-- ============================================================
-- Creates:
--   1. return_batches table
--   2. debit_memos table
--   3. debit_memo_items table
--   4. RPC: create_batch
--   5. RPC: list_batches
--   6. RPC: get_batch
--   7. RPC: assign_returns_to_batch
--   8. RPC: close_batch (generates debit memos)
--   9. RPC: submit_cardinal
--  10. RPC: list_debit_memos
--  11. RPC: get_debit_memo
--  12. RPC: update_debit_memo
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. return_batches table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS return_batches (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_month            DATE NOT NULL,
  batch_name             TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'submitted')),
  total_returns          INTEGER NOT NULL DEFAULT 0,
  total_debit_memos      INTEGER NOT NULL DEFAULT 0,
  total_value            DECIMAL(12,2) NOT NULL DEFAULT 0,
  cardinal_file_generated BOOLEAN NOT NULL DEFAULT FALSE,
  cardinal_file_url      TEXT,
  cardinal_submitted_at  TIMESTAMPTZ,
  cardinal_approved_at   TIMESTAMPTZ,
  closed_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rb_batch_month ON return_batches(batch_month);
CREATE INDEX IF NOT EXISTS idx_rb_status ON return_batches(status);

CREATE OR REPLACE FUNCTION update_return_batches_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_return_batches_updated_at ON return_batches;
CREATE TRIGGER trg_return_batches_updated_at
  BEFORE UPDATE ON return_batches
  FOR EACH ROW EXECUTE FUNCTION update_return_batches_updated_at();

ALTER TABLE return_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON return_batches;
CREATE POLICY "Allow all access via service role" ON return_batches
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2. debit_memos table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS debit_memos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID NOT NULL REFERENCES return_batches(id) ON DELETE CASCADE,
  pharmacy_id         UUID NOT NULL REFERENCES pharmacy(id) ON DELETE RESTRICT,
  memo_number         VARCHAR(30) NOT NULL UNIQUE,
  destination         TEXT,
  labeler_id          VARCHAR(10),
  labeler_name        TEXT,
  total_items         INTEGER NOT NULL DEFAULT 0,
  total_ask_value     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_received_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  ra_number           TEXT,
  ra_requested_at     TIMESTAMPTZ,
  ra_received_at      TIMESTAMPTZ,
  tickler_date        DATE,
  baggie_manifest     TEXT,
  outbound_tracking   TEXT,
  shipped_at          TIMESTAMPTZ,
  payment_status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'disputed')),
  amount_requested    DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_received     DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_batch       ON debit_memos(batch_id);
CREATE INDEX IF NOT EXISTS idx_dm_pharmacy    ON debit_memos(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_dm_destination ON debit_memos(destination);
CREATE INDEX IF NOT EXISTS idx_dm_payment     ON debit_memos(payment_status);

CREATE OR REPLACE FUNCTION update_debit_memos_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_debit_memos_updated_at ON debit_memos;
CREATE TRIGGER trg_debit_memos_updated_at
  BEFORE UPDATE ON debit_memos
  FOR EACH ROW EXECUTE FUNCTION update_debit_memos_updated_at();

ALTER TABLE debit_memos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON debit_memos;
CREATE POLICY "Allow all access via service role" ON debit_memos
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 3. debit_memo_items table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS debit_memo_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_memo_id       UUID NOT NULL REFERENCES debit_memos(id) ON DELETE CASCADE,
  transaction_item_id UUID REFERENCES return_transaction_items(id) ON DELETE SET NULL,
  ndc                 VARCHAR(13),
  product_name        TEXT,
  quantity            INTEGER NOT NULL DEFAULT 1,
  ask_price           DECIMAL(12,2),
  received_price      DECIMAL(12,2),
  lot_number          TEXT,
  expiration_date     DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dmi_memo ON debit_memo_items(debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_dmi_item ON debit_memo_items(transaction_item_id);

ALTER TABLE debit_memo_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON debit_memo_items;
CREATE POLICY "Allow all access via service role" ON debit_memo_items
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 4. Helper: _batch_to_json
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _batch_to_json(b return_batches)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                    b.id,
    'batchMonth',            b.batch_month,
    'batchName',             b.batch_name,
    'status',                b.status,
    'totalReturns',          b.total_returns,
    'totalDebitMemos',       b.total_debit_memos,
    'totalValue',            b.total_value,
    'cardinalFileGenerated', b.cardinal_file_generated,
    'cardinalFileUrl',       b.cardinal_file_url,
    'cardinalSubmittedAt',   b.cardinal_submitted_at,
    'cardinalApprovedAt',    b.cardinal_approved_at,
    'closedAt',              b.closed_at,
    'createdAt',             b.created_at,
    'updatedAt',             b.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Helper: _debit_memo_to_json
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _debit_memo_to_json(d debit_memos)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                 d.id,
    'batchId',            d.batch_id,
    'pharmacyId',         d.pharmacy_id,
    'pharmacyName',       COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), ''),
    'memoNumber',         d.memo_number,
    'destination',        d.destination,
    'labelerId',          d.labeler_id,
    'labelerName',        d.labeler_name,
    'totalItems',         d.total_items,
    'totalAskValue',      d.total_ask_value,
    'totalReceivedValue', d.total_received_value,
    'raNumber',           d.ra_number,
    'raRequestedAt',      d.ra_requested_at,
    'raReceivedAt',       d.ra_received_at,
    'ticklerDate',        d.tickler_date,
    'baggieManifest',     d.baggie_manifest,
    'outboundTracking',   d.outbound_tracking,
    'shippedAt',          d.shipped_at,
    'paymentStatus',      d.payment_status,
    'amountRequested',    d.amount_requested,
    'amountReceived',     d.amount_received,
    'createdAt',          d.created_at,
    'updatedAt',          d.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RPC: create_batch
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_batch(
  p_batch_month DATE,
  p_batch_name  TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_name TEXT;
  v_row  return_batches;
BEGIN
  -- Normalise to first of month
  p_batch_month := DATE_TRUNC('month', p_batch_month)::date;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM return_batches WHERE batch_month = p_batch_month) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('A batch already exists for %s', TO_CHAR(p_batch_month, 'Month YYYY')));
  END IF;

  v_name := COALESCE(NULLIF(TRIM(p_batch_name), ''), TO_CHAR(p_batch_month, 'Month YYYY'));

  INSERT INTO return_batches (batch_month, batch_name)
  VALUES (p_batch_month, v_name)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _batch_to_json(v_row));
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. RPC: list_batches
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION list_batches(
  p_status TEXT    DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
    FROM return_batches
   WHERE (p_status IS NULL OR status = p_status);

  SELECT COALESCE(jsonb_agg(row_json ORDER BY batch_month DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _batch_to_json(b) AS row_json, b.batch_month
        FROM return_batches b
       WHERE (p_status IS NULL OR b.status = p_status)
       ORDER BY b.batch_month DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page',  p_page, 'limit', p_limit,
      'total', v_total, 'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. RPC: get_batch
--    Returns batch + its debit memos + assigned returns
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_batch(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_row    return_batches;
  v_memos  jsonb;
  v_returns jsonb;
BEGIN
  SELECT * INTO v_row FROM return_batches WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(dm) ORDER BY dm.memo_number), '[]'::jsonb)
    INTO v_memos
    FROM debit_memos dm WHERE dm.batch_id = p_id;

  SELECT COALESCE(jsonb_agg(_rt_to_json(rt) ORDER BY rt.license_plate), '[]'::jsonb)
    INTO v_returns
    FROM return_transactions rt WHERE rt.batch_id = p_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'batch',      _batch_to_json(v_row),
      'debitMemos', v_memos,
      'returns',    v_returns
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. RPC: assign_returns_to_batch
--    Assigns one or more return transactions to a batch.
--    Returns must be in 'received' status (warehouse verified).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION assign_returns_to_batch(
  p_batch_id        UUID,
  p_transaction_ids UUID[]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch   return_batches;
  v_txn     return_transactions;
  v_count   INTEGER := 0;
  v_value   DECIMAL(12,2) := 0;
  v_tid     UUID;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status <> 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch is "%s". Only open batches can accept returns.', v_batch.status));
  END IF;

  FOREACH v_tid IN ARRAY p_transaction_ids LOOP
    SELECT * INTO v_txn FROM return_transactions WHERE id = v_tid;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Only received or closed_out returns can be batched
    IF v_txn.status NOT IN ('received', 'closed_out') THEN CONTINUE; END IF;

    -- Skip if already assigned to another batch
    IF v_txn.batch_id IS NOT NULL AND v_txn.batch_id <> p_batch_id THEN CONTINUE; END IF;

    UPDATE return_transactions SET batch_id = p_batch_id WHERE id = v_tid;
    v_count := v_count + 1;
    v_value := v_value + COALESCE(v_txn.total_returnable_value, 0);
  END LOOP;

  -- Update batch totals
  UPDATE return_batches SET
    total_returns = (SELECT COUNT(*) FROM return_transactions WHERE batch_id = p_batch_id),
    total_value   = (SELECT COALESCE(SUM(total_returnable_value), 0) FROM return_transactions WHERE batch_id = p_batch_id)
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error', false,
    'data', _batch_to_json(v_batch),
    'assigned', v_count
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 10. RPC: close_batch
--     Validates no TBD items, generates debit memos grouped
--     by (pharmacy, destination, labeler), then closes the batch.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION close_batch(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch        return_batches;
  v_tbd_count    INTEGER;
  v_no_dest      INTEGER;
  v_memo_count   INTEGER := 0;
  v_total_value  DECIMAL(12,2) := 0;
  v_group        RECORD;
  v_memo         debit_memos;
  v_memo_number  TEXT;
  v_seq          INTEGER := 1;
  v_month_code   TEXT;
  v_item         RECORD;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status <> 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch is "%s". Only open batches can be closed.', v_batch.status));
  END IF;

  IF v_batch.total_returns = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot close batch with no assigned returns.');
  END IF;

  -- Check for TBD items across all batch returns
  SELECT COUNT(*) INTO v_tbd_count
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
   WHERE rt.batch_id = p_batch_id
     AND rti.return_status = 'tbd';

  IF v_tbd_count > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot close: %s item(s) still have TBD status. Resolve all items first.', v_tbd_count));
  END IF;

  -- Check for returnable items without destination
  SELECT COUNT(*) INTO v_no_dest
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
   WHERE rt.batch_id = p_batch_id
     AND rti.return_status = 'returnable'
     AND (rti.destination IS NULL OR TRIM(rti.destination) = '');

  IF v_no_dest > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot close: %s returnable item(s) have no destination assigned.', v_no_dest));
  END IF;

  -- Month code for memo number (e.g. '0326' for March 2026)
  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  -- Delete any existing memos for this batch (in case of re-run)
  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  -- Generate debit memos grouped by pharmacy + destination + labeler_id
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') AS labeler_id,
      COUNT(*)               AS item_count,
      COALESCE(SUM(rti.estimated_value), 0) AS ask_value
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'
    GROUP BY rt.pharmacy_id, rti.destination, COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')
    ORDER BY rt.pharmacy_id, rti.destination
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');

    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, v_group.destination,
      v_group.labeler_id,
      COALESCE((SELECT manufacturer_name FROM manufacturer_policies WHERE labeler_id = v_group.labeler_id LIMIT 1), ''),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    -- Populate debit_memo_items
    INSERT INTO debit_memo_items (debit_memo_id, transaction_item_id, ndc, product_name, quantity, ask_price, lot_number, expiration_date)
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,
      rti.lot_number,
      rti.expiration_date
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') = v_group.labeler_id;

    v_memo_count := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq := v_seq + 1;
  END LOOP;

  -- Close the batch
  UPDATE return_batches SET
    status            = 'closed',
    closed_at         = NOW(),
    total_debit_memos = v_memo_count,
    total_value       = v_total_value
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error', false,
    'data', _batch_to_json(v_batch),
    'memosGenerated', v_memo_count
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 11. RPC: submit_cardinal
--     Marks batch as submitted to Cardinal
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION submit_cardinal(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch return_batches;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status <> 'closed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch is "%s". Must be closed before submitting.', v_batch.status));
  END IF;

  UPDATE return_batches SET
    status                 = 'submitted',
    cardinal_file_generated = TRUE,
    cardinal_submitted_at   = NOW()
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object('error', false, 'data', _batch_to_json(v_batch));
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 12. RPC: list_debit_memos
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION list_debit_memos(
  p_batch_id       UUID    DEFAULT NULL,
  p_pharmacy_id    UUID    DEFAULT NULL,
  p_destination    TEXT    DEFAULT NULL,
  p_payment_status TEXT    DEFAULT NULL,
  p_search         TEXT    DEFAULT NULL,
  p_page           INTEGER DEFAULT 1,
  p_limit          INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
    FROM debit_memos dm
   WHERE (p_batch_id IS NULL       OR dm.batch_id = p_batch_id)
     AND (p_pharmacy_id IS NULL    OR dm.pharmacy_id = p_pharmacy_id)
     AND (p_destination IS NULL    OR dm.destination = p_destination)
     AND (p_payment_status IS NULL OR dm.payment_status = p_payment_status)
     AND (
       p_search IS NULL
       OR dm.memo_number  ILIKE '%' || p_search || '%'
       OR dm.labeler_name ILIKE '%' || p_search || '%'
       OR dm.ra_number    ILIKE '%' || p_search || '%'
       OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = dm.pharmacy_id
                  AND p.pharmacy_name ILIKE '%' || p_search || '%')
     );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _debit_memo_to_json(dm) AS row_json, dm.created_at
        FROM debit_memos dm
       WHERE (p_batch_id IS NULL       OR dm.batch_id = p_batch_id)
         AND (p_pharmacy_id IS NULL    OR dm.pharmacy_id = p_pharmacy_id)
         AND (p_destination IS NULL    OR dm.destination = p_destination)
         AND (p_payment_status IS NULL OR dm.payment_status = p_payment_status)
         AND (
           p_search IS NULL
           OR dm.memo_number  ILIKE '%' || p_search || '%'
           OR dm.labeler_name ILIKE '%' || p_search || '%'
           OR dm.ra_number    ILIKE '%' || p_search || '%'
           OR EXISTS (SELECT 1 FROM pharmacy p WHERE p.id = dm.pharmacy_id
                      AND p.pharmacy_name ILIKE '%' || p_search || '%')
         )
       ORDER BY dm.created_at DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page',  p_page, 'limit', p_limit,
      'total', v_total, 'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 13. RPC: get_debit_memo (with items)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_debit_memo(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_memo  debit_memos;
  v_items jsonb;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                dmi.id,
      'debitMemoId',       dmi.debit_memo_id,
      'transactionItemId', dmi.transaction_item_id,
      'ndc',               dmi.ndc,
      'productName',       dmi.product_name,
      'quantity',          dmi.quantity,
      'askPrice',          dmi.ask_price,
      'receivedPrice',     dmi.received_price,
      'lotNumber',         dmi.lot_number,
      'expirationDate',    dmi.expiration_date,
      'createdAt',         dmi.created_at
    ) ORDER BY dmi.product_name, dmi.ndc
  ), '[]'::jsonb)
  INTO v_items
  FROM debit_memo_items dmi WHERE dmi.debit_memo_id = p_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',  _debit_memo_to_json(v_memo),
      'items', v_items
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 14. RPC: update_debit_memo
--     Updates RA info, payment info, shipping, etc.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_debit_memo(
  p_id                UUID,
  p_ra_number         TEXT    DEFAULT NULL,
  p_ra_requested_at   TIMESTAMPTZ DEFAULT NULL,
  p_ra_received_at    TIMESTAMPTZ DEFAULT NULL,
  p_tickler_date      DATE    DEFAULT NULL,
  p_baggie_manifest   TEXT    DEFAULT NULL,
  p_outbound_tracking TEXT    DEFAULT NULL,
  p_shipped_at        TIMESTAMPTZ DEFAULT NULL,
  p_payment_status    TEXT    DEFAULT NULL,
  p_amount_requested  DECIMAL DEFAULT NULL,
  p_amount_received   DECIMAL DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_memo debit_memos;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  UPDATE debit_memos SET
    ra_number         = COALESCE(p_ra_number,         ra_number),
    ra_requested_at   = COALESCE(p_ra_requested_at,   ra_requested_at),
    ra_received_at    = COALESCE(p_ra_received_at,     ra_received_at),
    tickler_date      = COALESCE(p_tickler_date,       tickler_date),
    baggie_manifest   = COALESCE(p_baggie_manifest,    baggie_manifest),
    outbound_tracking = COALESCE(p_outbound_tracking,  outbound_tracking),
    shipped_at        = COALESCE(p_shipped_at,         shipped_at),
    payment_status    = COALESCE(p_payment_status,     payment_status),
    amount_requested  = COALESCE(p_amount_requested,   amount_requested),
    amount_received   = COALESCE(p_amount_received,    amount_received)
  WHERE id = p_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object('error', false, 'data', _debit_memo_to_json(v_memo));
END;
$$;
