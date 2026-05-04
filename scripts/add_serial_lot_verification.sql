-- ============================================================
-- Add Serial Number and Lot Number Verification
-- ============================================================
-- This script updates warehouse_verify_item_v2 to accept and verify
-- serial number and lot number fields alongside NDC verification.
-- If provided values don't match expected values, discrepancies are created.
-- ============================================================

CREATE OR REPLACE FUNCTION warehouse_verify_item_v2(
  p_transaction_id      UUID,
  p_item_id             UUID,
  p_verification_status TEXT,
  p_actual_quantity     INTEGER DEFAULT NULL,
  p_condition_notes     TEXT    DEFAULT NULL,
  p_reported_by         UUID    DEFAULT NULL,
  p_non_returnable_reason TEXT  DEFAULT NULL,
  p_serial_number       TEXT    DEFAULT NULL,
  p_lot_number          TEXT    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn   return_transactions;
  v_item  return_transaction_items;
  v_disc  warehouse_discrepancies;
  v_reason TEXT;
  v_serial_mismatch BOOLEAN := FALSE;
  v_lot_mismatch BOOLEAN := FALSE;
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

  -- Check serial number mismatch
  IF p_serial_number IS NOT NULL AND TRIM(p_serial_number) != '' THEN
    IF v_item.serial_number IS NOT NULL AND TRIM(v_item.serial_number) != '' THEN
      IF TRIM(LOWER(p_serial_number)) != TRIM(LOWER(v_item.serial_number)) THEN
        v_serial_mismatch := TRUE;
      END IF;
    END IF;
  END IF;

  -- Check lot number mismatch
  IF p_lot_number IS NOT NULL AND TRIM(p_lot_number) != '' THEN
    IF v_item.lot_number IS NOT NULL AND TRIM(v_item.lot_number) != '' THEN
      IF TRIM(LOWER(p_lot_number)) != TRIM(LOWER(v_item.lot_number)) THEN
        v_lot_mismatch := TRUE;
      END IF;
    END IF;
  END IF;

  -- Resolve reason for non-correct verifications
  IF p_verification_status <> 'correct' THEN
    v_reason := NULLIF(TRIM(COALESCE(p_non_returnable_reason, '')), '');
    IF v_reason IS NULL THEN
      v_reason := CASE p_verification_status
        WHEN 'damaged'    THEN 'label_defaced_or_damaged'
        WHEN 'missing'    THEN 'minimum_quantity_not_met'
        WHEN 'wrong_item' THEN 'other'
        ELSE 'other'
      END;
    END IF;
  ELSE
    v_reason := NULL;
  END IF;

  -- Update item with verification details
  UPDATE return_transaction_items SET
    verified            = (p_verification_status = 'correct' AND NOT v_serial_mismatch AND NOT v_lot_mismatch),
    verification_status = p_verification_status,
    actual_quantity     = COALESCE(p_actual_quantity, actual_quantity),
    condition_notes     = COALESCE(p_condition_notes, condition_notes),
    return_status       = CASE
      WHEN p_verification_status != 'correct' OR v_serial_mismatch OR v_lot_mismatch
        THEN 'non_returnable'
      WHEN p_verification_status = 'correct'
        AND verification_status IS NOT NULL
        AND verification_status != 'correct'
        THEN 'returnable'
      ELSE return_status
    END,
    non_returnable_reason = CASE
      WHEN p_verification_status != 'correct' OR v_serial_mismatch OR v_lot_mismatch
        THEN v_reason
      WHEN p_verification_status = 'correct'
        AND verification_status IS NOT NULL
        AND verification_status != 'correct'
        THEN NULL
      ELSE non_returnable_reason
    END,
    serial_number = COALESCE(NULLIF(TRIM(p_serial_number), ''), serial_number),
    lot_number = COALESCE(NULLIF(TRIM(p_lot_number), ''), lot_number)
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Create discrepancy for damaged/missing/wrong_item status
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

  -- Create discrepancy for serial number mismatch
  IF v_serial_mismatch THEN
    INSERT INTO warehouse_discrepancies (
      transaction_id, item_id, type, ndc, product_name,
      expected_quantity, actual_quantity, notes, reported_by
    ) VALUES (
      p_transaction_id,
      p_item_id,
      'serial_mismatch',
      v_item.ndc,
      COALESCE(v_item.proprietary_name, v_item.generic_name),
      v_item.quantity,
      v_item.quantity,
      format('Serial number mismatch: Expected "%s", Got "%s"', v_item.serial_number, p_serial_number),
      p_reported_by
    );
  END IF;

  -- Create discrepancy for lot number mismatch
  IF v_lot_mismatch THEN
    INSERT INTO warehouse_discrepancies (
      transaction_id, item_id, type, ndc, product_name,
      expected_quantity, actual_quantity, notes, reported_by
    ) VALUES (
      p_transaction_id,
      p_item_id,
      'lot_mismatch',
      v_item.ndc,
      COALESCE(v_item.proprietary_name, v_item.generic_name),
      v_item.quantity,
      v_item.quantity,
      format('Lot number mismatch: Expected "%s", Got "%s"', v_item.lot_number, p_lot_number),
      p_reported_by
    );
  END IF;

  -- Update transaction totals
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
      'id',                  v_item.id,
      'transactionId',       v_item.transaction_id,
      'ndc',                 v_item.ndc,
      'proprietaryName',     v_item.proprietary_name,
      'genericName',         v_item.generic_name,
      'manufacturer',        v_item.manufacturer,
      'serialNumber',        v_item.serial_number,
      'lotNumber',           v_item.lot_number,
      'expirationDate',      v_item.expiration_date,
      'quantity',            v_item.quantity,
      'actualQuantity',      v_item.actual_quantity,
      'verified',            v_item.verified,
      'verificationStatus',  v_item.verification_status,
      'conditionNotes',      v_item.condition_notes,
      'returnStatus',        v_item.return_status,
      'nonReturnableReason', v_item.non_returnable_reason,
      'destination',         v_item.destination,
      'estimatedValue',      v_item.estimated_value,
      'discrepancyId',       CASE WHEN v_disc.id IS NOT NULL THEN v_disc.id ELSE NULL END,
      'serialMismatch',      v_serial_mismatch,
      'lotMismatch',         v_lot_mismatch
    )
  );
END;
$$;

-- Update GRANT statement to match new signature
GRANT EXECUTE ON FUNCTION warehouse_verify_item_v2(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION warehouse_verify_item_v2(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT) IS
  'Verify a return item with NDC, serial number, and lot number validation. Creates discrepancies for mismatches.';
