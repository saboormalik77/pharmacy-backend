-- ============================================================
-- Fix: Create destruction_records table and related functions
-- Applies fcr_10_create_destruction_records.sql and
-- fcr_48 destruction workflow scripts that were never migrated.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Create destruction_status enum (idempotent)
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE destruction_status AS ENUM (
    'pending',
    'scheduled',
    'picked_up',
    'destroyed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. Create destruction_records table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS destruction_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id          UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  transaction_item_id  UUID REFERENCES return_transaction_items(id) ON DELETE SET NULL,
  ndc                  VARCHAR(13),
  product_name         TEXT,
  manufacturer         TEXT,
  lot_number           TEXT,
  quantity             INTEGER DEFAULT 1,
  weight_lbs           DECIMAL(10, 4),
  destruction_reason   TEXT NOT NULL DEFAULT 'non_returnable',
  status               destruction_status NOT NULL DEFAULT 'pending',
  federal_form_number  TEXT,
  destruction_company  TEXT,
  scheduled_date       DATE,
  picked_up_at         TIMESTAMPTZ,
  destroyed_at         TIMESTAMPTZ,
  form_url             TEXT,
  notes                TEXT,
  created_by           UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 3. Indexes
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_destruction_records_pharmacy
  ON destruction_records(pharmacy_id);

CREATE INDEX IF NOT EXISTS idx_destruction_records_status
  ON destruction_records(status);

CREATE INDEX IF NOT EXISTS idx_destruction_records_transaction_item
  ON destruction_records(transaction_item_id);

CREATE INDEX IF NOT EXISTS idx_destruction_records_ndc
  ON destruction_records(ndc);

CREATE INDEX IF NOT EXISTS idx_destruction_records_created_at
  ON destruction_records(created_at DESC);

-- Prevent duplicate destruction records for the same transaction item
CREATE UNIQUE INDEX IF NOT EXISTS uq_destruction_records_transaction_item
  ON destruction_records(transaction_item_id)
  WHERE transaction_item_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 4. Auto-update updated_at trigger
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_destruction_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_destruction_records_updated_at ON destruction_records;
CREATE TRIGGER trg_destruction_records_updated_at
  BEFORE UPDATE ON destruction_records
  FOR EACH ROW
  EXECUTE FUNCTION update_destruction_records_updated_at();


-- ────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ────────────────────────────────────────────────────────────

ALTER TABLE destruction_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on destruction_records" ON destruction_records;
CREATE POLICY "Service role full access on destruction_records"
  ON destruction_records
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 6. RPC: create_destruction_record_for_transaction_item
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_destruction_record_for_transaction_item(
  p_transaction_item_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item      return_transaction_items;
  v_pharmacy_id UUID;
  v_existing  destruction_records;
  v_created   destruction_records;
BEGIN
  SELECT * INTO v_item
  FROM return_transaction_items
  WHERE id = p_transaction_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Transaction item not found');
  END IF;

  SELECT pharmacy_id INTO v_pharmacy_id
  FROM return_transactions
  WHERE id = v_item.transaction_id;

  IF v_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Parent return transaction not found');
  END IF;

  -- Idempotent: return existing active record if one already exists
  SELECT * INTO v_existing
  FROM destruction_records
  WHERE transaction_item_id = p_transaction_item_id
    AND status <> 'cancelled'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', false,
      'message', 'Destruction record already exists for this item',
      'data', jsonb_build_object(
        'id',                  v_existing.id,
        'pharmacyId',          v_existing.pharmacy_id,
        'transactionItemId',   v_existing.transaction_item_id,
        'ndc',                 v_existing.ndc,
        'productName',         v_existing.product_name,
        'manufacturer',        v_existing.manufacturer,
        'lotNumber',           v_existing.lot_number,
        'quantity',            v_existing.quantity,
        'weightLbs',           v_existing.weight_lbs,
        'destructionReason',   v_existing.destruction_reason,
        'status',              v_existing.status,
        'federalFormNumber',   v_existing.federal_form_number,
        'destructionCompany',  v_existing.destruction_company,
        'scheduledDate',       v_existing.scheduled_date,
        'pickedUpAt',          v_existing.picked_up_at,
        'destroyedAt',         v_existing.destroyed_at,
        'formUrl',             v_existing.form_url,
        'notes',               v_existing.notes,
        'createdBy',           v_existing.created_by,
        'createdAt',           v_existing.created_at,
        'updatedAt',           v_existing.updated_at
      )
    );
  END IF;

  INSERT INTO destruction_records (
    pharmacy_id,
    transaction_item_id,
    ndc,
    product_name,
    manufacturer,
    lot_number,
    quantity,
    destruction_reason,
    status,
    notes,
    created_by
  ) VALUES (
    v_pharmacy_id,
    v_item.id,
    v_item.ndc,
    COALESCE(v_item.proprietary_name, v_item.generic_name, ''),
    v_item.manufacturer,
    v_item.lot_number,
    COALESCE(NULLIF(v_item.quantity, 0), 1),
    COALESCE(v_item.non_returnable_reason, 'non_returnable'),
    'pending',
    COALESCE(NULLIF(TRIM(p_notes), ''), v_item.memo),
    p_created_by
  )
  RETURNING * INTO v_created;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Destruction record created',
    'data', jsonb_build_object(
      'id',                  v_created.id,
      'pharmacyId',          v_created.pharmacy_id,
      'transactionItemId',   v_created.transaction_item_id,
      'ndc',                 v_created.ndc,
      'productName',         v_created.product_name,
      'manufacturer',        v_created.manufacturer,
      'lotNumber',           v_created.lot_number,
      'quantity',            v_created.quantity,
      'weightLbs',           v_created.weight_lbs,
      'destructionReason',   v_created.destruction_reason,
      'status',              v_created.status,
      'federalFormNumber',   v_created.federal_form_number,
      'destructionCompany',  v_created.destruction_company,
      'scheduledDate',       v_created.scheduled_date,
      'pickedUpAt',          v_created.picked_up_at,
      'destroyedAt',         v_created.destroyed_at,
      'formUrl',             v_created.form_url,
      'notes',               v_created.notes,
      'createdBy',           v_created.created_by,
      'createdAt',           v_created.created_at,
      'updatedAt',           v_created.updated_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_destruction_record_for_transaction_item(UUID, UUID, TEXT)
  TO authenticated, anon, service_role;


-- ────────────────────────────────────────────────────────────
-- 7. RPC: resolve_transaction_item_with_auto_destination
--    (updates existing function to include destruction hook)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION resolve_transaction_item_with_auto_destination(
  p_item_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_destination TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item           return_transaction_items;
  v_auto_destination TEXT;
  v_updates        jsonb;
  v_result         jsonb;
  v_resolved       return_transaction_items;
  v_created_by     UUID := NULL;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  IF v_item.return_status != 'tbd' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Item is already classified as "%s". Only TBD items can be resolved.', v_item.return_status));
  END IF;

  v_updates := jsonb_build_object('returnStatus', p_new_status);

  IF p_reason IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('nonReturnableReason', p_reason);
  END IF;

  IF p_memo IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('memo', p_memo);
  END IF;

  IF p_new_status = 'returnable' AND (p_destination IS NULL OR TRIM(p_destination) = '') THEN
    v_auto_destination := get_destination_for_ndc(v_item.ndc);
    IF v_auto_destination IS NOT NULL THEN
      v_updates := v_updates || jsonb_build_object('destination', v_auto_destination);
    END IF;
  ELSIF p_destination IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('destination', p_destination);
  END IF;

  v_result := update_return_transaction_item(p_item_id, v_updates);
  IF (v_result->>'error')::boolean THEN
    RETURN v_result;
  END IF;

  -- Destruction workflow: auto-create record when non_returnable + destination=destruction
  IF p_new_status = 'non_returnable' THEN
    SELECT * INTO v_resolved FROM return_transaction_items WHERE id = p_item_id;
    IF LOWER(TRIM(COALESCE(v_resolved.destination, ''))) = 'destruction' THEN
      PERFORM create_destruction_record_for_transaction_item(p_item_id, v_created_by, p_memo);
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_transaction_item_with_auto_destination(UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated, anon, service_role;
