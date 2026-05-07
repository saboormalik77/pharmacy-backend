-- ============================================================
-- FCR Module 3 — Return Transactions table + RPC functions
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS return_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate VARCHAR(25) NOT NULL UNIQUE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE RESTRICT,
  processor_id UUID REFERENCES processors(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL DEFAULT 'in_store'
    CHECK (service_type IN ('in_store', 'self_service', 'express')),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','paused','completed','finalized','received','closed_out')),
  fedex_tracking TEXT,
  fedex_pickup_confirmation TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_returnable_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_non_returnable_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  batch_id UUID,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  received_in_warehouse_date TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  verified_integrity BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_pharmacy      ON return_transactions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_rt_processor     ON return_transactions(processor_id);
CREATE INDEX IF NOT EXISTS idx_rt_status        ON return_transactions(status);
CREATE INDEX IF NOT EXISTS idx_rt_license_plate ON return_transactions(license_plate);
CREATE INDEX IF NOT EXISTS idx_rt_created_at    ON return_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rt_batch         ON return_transactions(batch_id);

CREATE OR REPLACE FUNCTION update_return_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_return_transactions_updated_at ON return_transactions;
CREATE TRIGGER trg_return_transactions_updated_at
  BEFORE UPDATE ON return_transactions
  FOR EACH ROW EXECUTE FUNCTION update_return_transactions_updated_at();

ALTER TABLE return_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON return_transactions;
CREATE POLICY "Allow all access via service role" ON return_transactions
  FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- 2. HELPER: build a return-transaction JSON object
--    Joins pharmacy_name + processor name so callers don't have to.
-- ============================================================
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
    'notes',                    r.notes,
    'finalizedAt',              r.finalized_at,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;


-- ============================================================
-- 3. RPC: create_return_transaction
--    Generates license plate, checks for duplicates, inserts.
-- ============================================================
CREATE OR REPLACE FUNCTION create_return_transaction(
  p_pharmacy_id   UUID,
  p_processor_id  UUID DEFAULT NULL,
  p_service_type  TEXT DEFAULT 'in_store',
  p_notes         TEXT DEFAULT NULL,
  p_force_create  BOOLEAN DEFAULT FALSE
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pharmacy      RECORD;
  v_existing      RECORD;
  v_store_num     TEXT;
  v_date_str      TEXT;
  v_base_plate    TEXT;
  v_license_plate TEXT;
  v_collision_cnt INT;
  v_new           return_transactions;
BEGIN
  -- 1. Verify pharmacy exists
  SELECT id, pharmacy_name, store_number
    INTO v_pharmacy
    FROM pharmacy
   WHERE id = p_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  -- 2. Duplicate prevention (unless force_create)
  IF NOT p_force_create THEN
    SELECT id, license_plate, status
      INTO v_existing
      FROM return_transactions
     WHERE pharmacy_id = p_pharmacy_id
       AND status IN ('in_progress', 'paused')
     LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'error', true,
        'code', 409,
        'message', format(
          'This pharmacy already has an active return (%s, status: %s). Use forceCreate=true to override.',
          v_existing.license_plate, v_existing.status
        ),
        'existingId', v_existing.id,
        'existingLicensePlate', v_existing.license_plate
      );
    END IF;
  END IF;

  -- 3. Validate service type
  IF p_service_type NOT IN ('in_store', 'self_service', 'express') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'service_type must be one of: in_store, self_service, express');
  END IF;

  -- 4. Generate license plate: MMDDYY-23HA-XXXX
  v_store_num := COALESCE(v_pharmacy.store_number, UPPER(LEFT(p_pharmacy_id::text, 4)));
  v_date_str  := TO_CHAR(NOW(), 'MMDDYY');
  v_base_plate := v_date_str || '-23HA-' || v_store_num;

  SELECT COUNT(*) INTO v_collision_cnt
    FROM return_transactions
   WHERE license_plate LIKE v_base_plate || '%';

  IF v_collision_cnt = 0 THEN
    v_license_plate := v_base_plate;
  ELSE
    v_license_plate := v_base_plate || '-' || CHR(65 + v_collision_cnt); -- -A, -B, …
  END IF;

  -- 5. Insert
  INSERT INTO return_transactions (
    license_plate, pharmacy_id, processor_id, service_type,
    status, notes, time_in
  ) VALUES (
    v_license_plate, p_pharmacy_id, p_processor_id, p_service_type,
    'in_progress', NULLIF(TRIM(COALESCE(p_notes,'')), ''), NOW()
  ) RETURNING * INTO v_new;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_new));
END;
$$;


-- ============================================================
-- 4. RPC: list_return_transactions
-- ============================================================
CREATE OR REPLACE FUNCTION list_return_transactions(
  p_pharmacy_id  UUID    DEFAULT NULL,
  p_processor_id UUID    DEFAULT NULL,
  p_status       TEXT    DEFAULT NULL,
  p_date_from    TEXT    DEFAULT NULL,
  p_date_to      TEXT    DEFAULT NULL,
  p_search       TEXT    DEFAULT NULL,
  p_page         INT     DEFAULT 1,
  p_limit        INT     DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INT;
  v_total    INT;
  v_rows     jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_limit, 100);

  -- Count
  SELECT COUNT(*) INTO v_total
    FROM return_transactions rt
   WHERE (p_pharmacy_id  IS NULL OR rt.pharmacy_id  = p_pharmacy_id)
     AND (p_processor_id IS NULL OR rt.processor_id = p_processor_id)
     AND (p_status       IS NULL OR rt.status       = p_status)
     AND (p_date_from    IS NULL OR rt.created_at  >= p_date_from::timestamptz)
     AND (p_date_to      IS NULL OR rt.created_at  <= p_date_to::timestamptz)
     AND (p_search       IS NULL OR rt.license_plate ILIKE '%' || p_search || '%');

  -- Data
  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT _rt_to_json(rt) AS row_json, rt.created_at
        FROM return_transactions rt
       WHERE (p_pharmacy_id  IS NULL OR rt.pharmacy_id  = p_pharmacy_id)
         AND (p_processor_id IS NULL OR rt.processor_id = p_processor_id)
         AND (p_status       IS NULL OR rt.status       = p_status)
         AND (p_date_from    IS NULL OR rt.created_at  >= p_date_from::timestamptz)
         AND (p_date_to      IS NULL OR rt.created_at  <= p_date_to::timestamptz)
         AND (p_search       IS NULL OR rt.license_plate ILIKE '%' || p_search || '%')
       ORDER BY rt.created_at DESC
       LIMIT LEAST(p_limit, 100) OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'transactions', v_rows,
    'pagination', jsonb_build_object(
      'page',       GREATEST(p_page, 1),
      'limit',      LEAST(p_limit, 100),
      'total',      v_total,
      'totalPages', CEIL(v_total::numeric / LEAST(p_limit, 100))
    )
  );
END;
$$;


-- ============================================================
-- 5. RPC: get_return_transaction_by_id
-- ============================================================
CREATE OR REPLACE FUNCTION get_return_transaction_by_id(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;
  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;


-- ============================================================
-- 6. RPC: update_return_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION update_return_transaction(
  p_id                        UUID,
  p_fedex_tracking            TEXT DEFAULT NULL,
  p_fedex_pickup_confirmation TEXT DEFAULT NULL,
  p_notes                     TEXT DEFAULT NULL,
  p_service_type              TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  IF v_row.status IN ('finalized', 'closed_out') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot update a finalized or closed-out return transaction');
  END IF;

  IF p_service_type IS NOT NULL AND p_service_type NOT IN ('in_store','self_service','express') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'service_type must be one of: in_store, self_service, express');
  END IF;

  UPDATE return_transactions SET
    fedex_tracking            = COALESCE(p_fedex_tracking,            fedex_tracking),
    fedex_pickup_confirmation = COALESCE(p_fedex_pickup_confirmation, fedex_pickup_confirmation),
    notes                     = COALESCE(p_notes,                     notes),
    service_type              = COALESCE(p_service_type,              service_type)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;


-- ============================================================
-- 7. RPC: change_return_transaction_status
--    Handles all status transitions: pause, resume, complete, finalize
-- ============================================================
CREATE OR REPLACE FUNCTION change_return_transaction_status(
  p_id         UUID,
  p_new_status TEXT   -- 'paused','in_progress','completed','finalized'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  -- Validate transitions
  CASE p_new_status
    WHEN 'paused' THEN
      IF v_row.status <> 'in_progress' THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot pause a return with status "%s". Only in_progress returns can be paused.', v_row.status));
      END IF;

    WHEN 'in_progress' THEN  -- resume
      IF v_row.status <> 'paused' THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot resume a return with status "%s". Only paused returns can be resumed.', v_row.status));
      END IF;

    WHEN 'completed' THEN
      IF v_row.status NOT IN ('in_progress', 'paused') THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot complete a return with status "%s".', v_row.status));
      END IF;

    WHEN 'finalized' THEN
      IF v_row.status <> 'completed' THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot finalize a return with status "%s". Must be completed first.', v_row.status));
      END IF;

    ELSE
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Invalid target status: %s', p_new_status));
  END CASE;

  -- Apply transition
  UPDATE return_transactions SET
    status       = p_new_status,
    time_out     = CASE WHEN p_new_status = 'completed'  THEN NOW()       ELSE time_out     END,
    finalized_at = CASE WHEN p_new_status = 'finalized'  THEN NOW()       ELSE finalized_at  END
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;


-- ============================================================
-- 8. RPC: delete_return_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION delete_return_transaction(p_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  IF v_row.status IN ('finalized', 'closed_out', 'received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete a return with status "%s".', v_row.status));
  END IF;

  DELETE FROM return_transactions WHERE id = p_id;

  RETURN jsonb_build_object('error', false, 'message', 'Return transaction deleted');
END;
$$;
