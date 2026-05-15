-- Function : warehouse_verify_item_v2
-- Arguments: p_transaction_id uuid, p_item_id uuid, p_verification_status text, p_actual_quantity integer, p_condition_notes text, p_reported_by uuid, p_non_returnable_reason text, p_serial_number text, p_lot_number text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_verify_item_v2(p_transaction_id uuid, p_item_id uuid, p_verification_status text, p_actual_quantity integer, p_condition_notes text, p_reported_by uuid, p_non_returnable_reason text, p_serial_number text, p_lot_number text) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_verify_item_v2(p_transaction_id uuid, p_item_id uuid, p_verification_status text, p_actual_quantity integer DEFAULT NULL::integer, p_condition_notes text DEFAULT NULL::text, p_reported_by uuid DEFAULT NULL::uuid, p_non_returnable_reason text DEFAULT NULL::text, p_serial_number text DEFAULT NULL::text, p_lot_number text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- Update the item with serial number and lot number if provided
  UPDATE return_transaction_items SET
    verified            = (p_verification_status = 'correct'),
    verification_status = p_verification_status,
    actual_quantity     = COALESCE(p_actual_quantity, actual_quantity),
    condition_notes     = COALESCE(p_condition_notes, condition_notes),
    serial_number       = COALESCE(p_serial_number, serial_number),
    lot_number          = COALESCE(p_lot_number, lot_number),
    non_returnable_reason = CASE
      WHEN p_verification_status != 'correct' THEN COALESCE(p_non_returnable_reason, 'other')
      ELSE non_returnable_reason
    END,
    return_status       = CASE
      WHEN p_verification_status != 'correct'
        THEN 'non_returnable'
      WHEN p_verification_status = 'correct'
        AND verification_status IS NOT NULL
        AND verification_status != 'correct'
        THEN 'returnable'
      ELSE return_status
    END
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

  -- Recalculate stored totals on the return transaction
  UPDATE return_transactions SET
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = p_transaction_id
         AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = p_transaction_id
         AND return_status = 'non_returnable'
    )
  WHERE id = p_transaction_id;

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
      'serialNumber',       v_item.serial_number,
      'expirationDate',     v_item.expiration_date,
      'quantity',           v_item.quantity,
      'actualQuantity',     v_item.actual_quantity,
      'verified',           v_item.verified,
      'verificationStatus', v_item.verification_status,
      'returnStatus',       v_item.return_status,
      'conditionNotes',     v_item.condition_notes,
      'nonReturnableReason', v_item.non_returnable_reason,
      'estimatedValue',     v_item.estimated_value
    )
  );
END;
$function$;
