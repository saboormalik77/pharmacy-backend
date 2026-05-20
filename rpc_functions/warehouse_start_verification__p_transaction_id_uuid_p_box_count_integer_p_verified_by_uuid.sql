-- Function : warehouse_start_verification
-- Arguments: p_transaction_id uuid, p_box_count integer, p_verified_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_start_verification(p_transaction_id uuid, p_box_count integer, p_verified_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_start_verification(p_transaction_id uuid, p_box_count integer, p_verified_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
