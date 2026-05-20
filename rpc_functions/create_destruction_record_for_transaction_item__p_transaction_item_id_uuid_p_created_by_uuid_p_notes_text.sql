-- Function : create_destruction_record_for_transaction_item
-- Arguments: p_transaction_item_id uuid, p_created_by uuid, p_notes text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_destruction_record_for_transaction_item(p_transaction_item_id uuid, p_created_by uuid, p_notes text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_destruction_record_for_transaction_item(p_transaction_item_id uuid, p_created_by uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
