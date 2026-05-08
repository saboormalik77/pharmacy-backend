-- ============================================================
-- FCR Module 39 — Multi-Memo Shipping to Same Destination
-- Run this in Supabase SQL Editor
--
-- Contents:
--   1. shipment_groups table
--   2. Add shipment_group_id to debit_memos
--   3. RPC: create_shipment_group (create group for multiple memos)
--   4. RPC: ship_memo_group (ship all memos in a group)
--   5. RPC: list_memos_for_group_shipping (get memos ready to group)
--   6. Update _debit_memo_to_json to include shipment group info
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. shipment_groups table — groups multiple memos for shipping
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipment_groups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination         TEXT NOT NULL,
  outbound_tracking   TEXT,
  shipped_at          TIMESTAMPTZ,
  box_count          INTEGER DEFAULT 1,
  total_memos        INTEGER DEFAULT 0,
  fedex_shipment_id  TEXT,
  fedex_labels       JSONB,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sg_destination ON shipment_groups(destination);
CREATE INDEX IF NOT EXISTS idx_sg_shipped_at ON shipment_groups(shipped_at);
CREATE INDEX IF NOT EXISTS idx_sg_created_at ON shipment_groups(created_at);

ALTER TABLE shipment_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON shipment_groups;
CREATE POLICY "Allow all access via service role" ON shipment_groups
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_shipment_groups_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shipment_groups_updated_at ON shipment_groups;
CREATE TRIGGER trg_shipment_groups_updated_at
  BEFORE UPDATE ON shipment_groups
  FOR EACH ROW EXECUTE FUNCTION update_shipment_groups_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Add shipment_group_id to debit_memos (if not exists)
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debit_memos' AND column_name = 'shipment_group_id'
  ) THEN
    ALTER TABLE debit_memos ADD COLUMN shipment_group_id UUID REFERENCES shipment_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dm_shipment_group ON debit_memos(shipment_group_id);

-- ────────────────────────────────────────────────────────────
-- 3. Helper: _shipment_group_to_json
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _shipment_group_to_json(sg shipment_groups)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',               sg.id,
    'destination',      sg.destination,
    'outboundTracking', sg.outbound_tracking,
    'shippedAt',        sg.shipped_at,
    'boxCount',         sg.box_count,
    'totalMemos',       sg.total_memos,
    'fedexShipmentId',  sg.fedex_shipment_id,
    'fedexLabels',      sg.fedex_labels,
    'notes',            sg.notes,
    'createdAt',        sg.created_at,
    'updatedAt',        sg.updated_at
  );
$$;

-- ────────────────────────────────────────────────────────────
-- 4. RPC: create_shipment_group
--    Creates a group and assigns multiple memos to it
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_shipment_group(
  p_memo_ids     UUID[],
  p_box_count    INTEGER DEFAULT 1,
  p_notes        TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_destination TEXT;
  v_group_id    UUID;
  v_memo_count  INTEGER;
  v_memo        debit_memos;
  v_group       shipment_groups;
BEGIN
  -- Validate input
  IF p_memo_ids IS NULL OR array_length(p_memo_ids, 1) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'At least one memo ID is required');
  END IF;

  -- Check all memos exist and have RA numbers
  FOR i IN 1..array_length(p_memo_ids, 1) LOOP
    SELECT * INTO v_memo FROM debit_memos WHERE id = p_memo_ids[i];
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Memo not found: ' || p_memo_ids[i]);
    END IF;
    
    IF v_memo.ra_number IS NULL OR TRIM(v_memo.ra_number) = '' THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' does not have an RA number');
    END IF;
    
    IF v_memo.ra_status != 'received' THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' RA status is not "received"');
    END IF;
    
    IF v_memo.shipped_at IS NOT NULL THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' is already shipped');
    END IF;
    
    IF v_memo.shipment_group_id IS NOT NULL THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' is already in a shipment group');
    END IF;

    -- Check destination consistency (case-insensitive, trimmed)
    IF v_destination IS NULL THEN
      v_destination := v_memo.destination;
    ELSIF LOWER(TRIM(COALESCE(v_destination, ''))) IS DISTINCT FROM LOWER(TRIM(COALESCE(v_memo.destination, ''))) THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'All memos must have the same destination');
    END IF;
  END LOOP;

  -- Create shipment group
  v_memo_count := array_length(p_memo_ids, 1);
  
  INSERT INTO shipment_groups (destination, box_count, total_memos, notes)
  VALUES (v_destination, p_box_count, v_memo_count, p_notes)
  RETURNING id INTO v_group_id;

  -- Assign memos to group
  UPDATE debit_memos 
  SET shipment_group_id = v_group_id
  WHERE id = ANY(p_memo_ids);

  -- Return the created group with memo details
  SELECT * INTO v_group FROM shipment_groups WHERE id = v_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group', _shipment_group_to_json(v_group),
      'memoIds', to_jsonb(p_memo_ids),
      'memoCount', v_memo_count
    )
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: ship_memo_group
--    Ships all memos in a group with same tracking
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ship_memo_group(
  p_group_id          UUID,
  p_outbound_tracking TEXT,
  p_shipped_at        TIMESTAMPTZ DEFAULT NOW(),
  p_fedex_shipment_id TEXT DEFAULT NULL,
  p_fedex_labels      JSONB DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_group       shipment_groups;
  v_memo_count  INTEGER;
BEGIN
  -- Get the group
  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Shipment group not found');
  END IF;

  IF v_group.shipped_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Shipment group is already shipped');
  END IF;

  IF p_outbound_tracking IS NULL OR TRIM(p_outbound_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Outbound tracking number is required');
  END IF;

  -- Update the group (COALESCE: clients often pass NULL for p_shipped_at; PG defaults do not apply to explicit NULL)
  UPDATE shipment_groups SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at = COALESCE(p_shipped_at, NOW()),
    fedex_shipment_id = p_fedex_shipment_id,
    fedex_labels = p_fedex_labels
  WHERE id = p_group_id;

  -- Update all memos in the group
  UPDATE debit_memos SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at = COALESCE(p_shipped_at, NOW()),
    ra_status = 'shipped'
  WHERE shipment_group_id = p_group_id;

  GET DIAGNOSTICS v_memo_count = ROW_COUNT;

  -- Return updated group info
  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group', _shipment_group_to_json(v_group),
      'memosShipped', v_memo_count
    )
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 6. RPC: list_memos_for_group_shipping
--    Lists memos ready to be grouped by destination
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION list_memos_for_group_shipping(
  p_destination TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_rows jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.destination, d.created_at), '[]'::jsonb)
  INTO v_rows
  FROM debit_memos d
  WHERE d.ra_status = 'received'
    AND d.shipped_at IS NULL
    AND d.shipment_group_id IS NULL
    AND d.ra_number IS NOT NULL
    AND TRIM(d.ra_number) != ''
    AND (p_destination IS NULL OR LOWER(d.destination) = LOWER(p_destination));

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 7. RPC: get_shipment_group_details
--    Gets group info with all associated memos
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_shipment_group_details(
  p_group_id UUID
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_group shipment_groups;
  v_memos jsonb;
BEGIN
  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Shipment group not found');
  END IF;

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.created_at), '[]'::jsonb)
  INTO v_memos
  FROM debit_memos d
  WHERE d.shipment_group_id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group', _shipment_group_to_json(v_group),
      'memos', v_memos
    )
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 8. Update _debit_memo_to_json to include shipment group info
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _debit_memo_to_json(d debit_memos)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                  d.id,
    'batchId',             d.batch_id,
    'pharmacyId',          d.pharmacy_id,
    'pharmacyName',        (SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id),
    'memoNumber',          d.memo_number,
    'destination',         d.destination,
    'labelerId',           d.labeler_id,
    'labelerName',         d.labeler_name,
    'totalItems',          d.total_items,
    'totalAskValue',       d.total_ask_value,
    'totalReceivedValue',  d.total_received_value,
    'raNumber',            d.ra_number,
    'raRequestedAt',       d.ra_requested_at,
    'raReceivedAt',        d.ra_received_at,
    'raStatus',            d.ra_status,
    'ticklerDate',         d.tickler_date,
    'baggieManifest',      d.baggie_manifest,
    'outboundTracking',    d.outbound_tracking,
    'shippedAt',           d.shipped_at,
    'paymentStatus',       d.payment_status,
    'amountRequested',     d.amount_requested,
    'amountReceived',      d.amount_received,
    'paymentReceivedAt',   d.payment_received_at,
    'paymentReference',    d.payment_reference,
    'paymentNotes',        d.payment_notes,
    'fedexLabels',         d.fedex_labels,
    'creditMemoUrl',       d.credit_memo_url,
    'shipmentGroupId',     d.shipment_group_id,
    'createdAt',           d.created_at,
    'updatedAt',           d.updated_at
  );
$$;