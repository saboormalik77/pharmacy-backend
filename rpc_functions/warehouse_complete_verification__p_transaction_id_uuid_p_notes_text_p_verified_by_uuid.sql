-- Function : warehouse_complete_verification
-- Arguments: p_transaction_id uuid, p_notes text, p_verified_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_complete_verification(p_transaction_id uuid, p_notes text, p_verified_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_complete_verification(p_transaction_id uuid, p_notes text DEFAULT NULL::text, p_verified_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_txn               return_transactions;
  v_total_items       INTEGER;
  v_verified_count    INTEGER;
  v_correct_count     INTEGER;
  v_damaged_count     INTEGER;
  v_missing_count     INTEGER;
  v_wrong_count       INTEGER;
  v_unverified_count  INTEGER;
  v_surplus_count     INTEGER;
  v_open_disc         INTEGER;
  v_correct_value     DECIMAL(12,2);
  v_excluded_count    INTEGER;
  v_new_returnable    DECIMAL(12,2);
  v_new_non_ret       DECIMAL(12,2);
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_txn.status NOT IN ('received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot complete verification for status "%s". Must be received.', v_txn.status));
  END IF;

  -- Count items by verification status
  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_verified_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status IS NOT NULL;

  SELECT COUNT(*) INTO v_correct_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'correct';

  SELECT COUNT(*) INTO v_damaged_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'damaged';

  SELECT COUNT(*) INTO v_missing_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'missing';

  SELECT COUNT(*) INTO v_wrong_count
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'wrong_item';

  v_unverified_count := v_total_items - v_verified_count;

  IF v_unverified_count > 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('%s item(s) have not been verified yet. Please verify all items before completing.', v_unverified_count));
  END IF;

  -- Count surplus and open discrepancies
  SELECT COUNT(*) INTO v_surplus_count
    FROM warehouse_surplus_items WHERE transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_open_disc
    FROM warehouse_discrepancies WHERE transaction_id = p_transaction_id AND status = 'open';

  -- Value of correct items only
  SELECT COALESCE(SUM(estimated_value), 0) INTO v_correct_value
    FROM return_transaction_items WHERE transaction_id = p_transaction_id
      AND verification_status = 'correct';

  -- Safety net: force non-correct items to non_returnable
  -- (warehouse_verify_item_v2 already does this per-item, but this
  --  catches any items verified before FCR-50 was deployed)
  UPDATE return_transaction_items
  SET return_status = 'non_returnable'
  WHERE transaction_id = p_transaction_id
    AND verification_status IS NOT NULL
    AND verification_status != 'correct'
    AND return_status IN ('returnable', 'tbd');
  GET DIAGNOSTICS v_excluded_count = ROW_COUNT;

  -- Recalculate stored totals
  SELECT
    COALESCE(SUM(estimated_value) FILTER (WHERE return_status = 'returnable'), 0),
    COALESCE(SUM(estimated_value) FILTER (WHERE return_status = 'non_returnable'), 0)
  INTO v_new_returnable, v_new_non_ret
  FROM return_transaction_items
  WHERE transaction_id = p_transaction_id;

  -- Mark the return as verified / completed
  UPDATE return_transactions SET
    status                     = 'verified',
    verified_integrity         = (v_damaged_count = 0 AND v_missing_count = 0 AND v_wrong_count = 0),
    verification_completed_at  = NOW(),
    verified_at                = COALESCE(verified_at, NOW()),
    verified_by                = COALESCE(p_verified_by, verified_by),
    notes                      = COALESCE(p_notes, notes),
    total_returnable_value     = v_new_returnable,
    total_non_returnable_value = v_new_non_ret
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction',   _rt_to_json(v_txn),
      'summary', jsonb_build_object(
        'totalItems',        v_total_items,
        'correctItems',      v_correct_count,
        'damagedItems',      v_damaged_count,
        'missingItems',      v_missing_count,
        'wrongItems',        v_wrong_count,
        'surplusItems',      v_surplus_count,
        'openDiscrepancies', v_open_disc,
        'correctItemsValue', v_correct_value,
        'allItemsIntact',    (v_damaged_count = 0 AND v_missing_count = 0 AND v_wrong_count = 0),
        'excludedFromBatch', v_excluded_count
      )
    )
  );
END;
$function$;
