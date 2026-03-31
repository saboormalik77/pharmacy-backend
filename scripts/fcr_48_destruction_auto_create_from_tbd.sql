-- FCR 48 — Auto-create destruction records from TBD resolution
-- When an item is resolved to non_returnable with destination "destruction",
-- backend calls this RPC to create a pharmacy-side destruction workflow record.

-- Prevent duplicate destruction records for the same transaction item.
CREATE UNIQUE INDEX IF NOT EXISTS uq_destruction_records_transaction_item
  ON destruction_records(transaction_item_id)
  WHERE transaction_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION create_destruction_record_for_transaction_item(
  p_transaction_item_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_pharmacy_id UUID;
  v_existing destruction_records;
  v_created destruction_records;
BEGIN
  SELECT * INTO v_item
  FROM return_transaction_items
  WHERE id = p_transaction_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Transaction item not found');
  END IF;

  IF v_item.return_status <> 'non_returnable' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Item status is "%s". Only non_returnable items can be routed to destruction.', v_item.return_status));
  END IF;

  IF LOWER(TRIM(COALESCE(v_item.destination, ''))) <> 'destruction' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Item destination is "%s". Destination must be "destruction".', COALESCE(v_item.destination, '')));
  END IF;

  SELECT pharmacy_id INTO v_pharmacy_id
  FROM return_transactions
  WHERE id = v_item.transaction_id;

  IF v_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Parent return transaction not found');
  END IF;

  SELECT * INTO v_existing
  FROM destruction_records
  WHERE transaction_item_id = p_transaction_item_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', false,
      'message', 'Destruction record already exists for this item',
      'data', v_existing
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
    COALESCE(v_item.non_returnable_reason, 'manual'),
    'pending',
    COALESCE(NULLIF(TRIM(p_notes), ''), v_item.memo),
    p_created_by
  )
  RETURNING * INTO v_created;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Destruction record created',
    'data', v_created
  );
END;
$$;
