-- FCR 48 — TBD resolve + destruction workflow
-- 1) Add helper RPC to create destruction record from a return item (idempotent)
-- 2) Update resolve_transaction_item_with_auto_destination so resolving
--    non_returnable + destination=destruction auto-creates the destruction record

CREATE OR REPLACE FUNCTION create_destruction_record_for_transaction_item(
  p_transaction_item_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_txn  return_transactions;
  v_existing destruction_records;
  v_new destruction_records;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_transaction_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Transaction item not found');
  END IF;

  SELECT * INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Parent transaction not found');
  END IF;

  -- Idempotent: keep one active destruction record per transaction item.
  SELECT * INTO v_existing
  FROM destruction_records
  WHERE transaction_item_id = p_transaction_item_id
    AND status <> 'cancelled'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', false,
      'data', jsonb_build_object(
        'id', v_existing.id,
        'pharmacyId', v_existing.pharmacy_id,
        'transactionItemId', v_existing.transaction_item_id,
        'ndc', v_existing.ndc,
        'productName', v_existing.product_name,
        'manufacturer', v_existing.manufacturer,
        'lotNumber', v_existing.lot_number,
        'quantity', v_existing.quantity,
        'weightLbs', v_existing.weight_lbs,
        'destructionReason', v_existing.destruction_reason,
        'status', v_existing.status,
        'federalFormNumber', v_existing.federal_form_number,
        'destructionCompany', v_existing.destruction_company,
        'scheduledDate', v_existing.scheduled_date,
        'pickedUpAt', v_existing.picked_up_at,
        'destroyedAt', v_existing.destroyed_at,
        'formUrl', v_existing.form_url,
        'notes', v_existing.notes,
        'createdBy', v_existing.created_by,
        'createdAt', v_existing.created_at,
        'updatedAt', v_existing.updated_at
      ),
      'message', 'Destruction record already exists'
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
    v_txn.pharmacy_id,
    v_item.id,
    v_item.ndc,
    COALESCE(v_item.proprietary_name, v_item.generic_name, ''),
    v_item.manufacturer,
    v_item.lot_number,
    COALESCE(v_item.quantity, 1),
    'non_returnable',
    'pending',
    NULLIF(TRIM(COALESCE(p_notes, v_item.memo, '')), ''),
    p_created_by
  )
  RETURNING * INTO v_new;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id', v_new.id,
      'pharmacyId', v_new.pharmacy_id,
      'transactionItemId', v_new.transaction_item_id,
      'ndc', v_new.ndc,
      'productName', v_new.product_name,
      'manufacturer', v_new.manufacturer,
      'lotNumber', v_new.lot_number,
      'quantity', v_new.quantity,
      'weightLbs', v_new.weight_lbs,
      'destructionReason', v_new.destruction_reason,
      'status', v_new.status,
      'federalFormNumber', v_new.federal_form_number,
      'destructionCompany', v_new.destruction_company,
      'scheduledDate', v_new.scheduled_date,
      'pickedUpAt', v_new.picked_up_at,
      'destroyedAt', v_new.destroyed_at,
      'formUrl', v_new.form_url,
      'notes', v_new.notes,
      'createdBy', v_new.created_by,
      'createdAt', v_new.created_at,
      'updatedAt', v_new.updated_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION resolve_transaction_item_with_auto_destination(
  p_item_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_destination TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_auto_destination TEXT;
  v_updates jsonb;
  v_result jsonb;
  v_resolved return_transaction_items;
  v_created_by UUID := NULL;
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

  -- Destruction workflow hook: non-returnable + destruction destination.
  IF p_new_status = 'non_returnable' THEN
    SELECT * INTO v_resolved FROM return_transaction_items WHERE id = p_item_id;
    IF LOWER(TRIM(COALESCE(v_resolved.destination, ''))) = 'destruction' THEN
      PERFORM create_destruction_record_for_transaction_item(p_item_id, v_created_by, p_memo);
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_destruction_record_for_transaction_item(UUID, UUID, TEXT)
TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION resolve_transaction_item_with_auto_destination(UUID, TEXT, TEXT, TEXT, TEXT)
TO authenticated, anon, service_role;

