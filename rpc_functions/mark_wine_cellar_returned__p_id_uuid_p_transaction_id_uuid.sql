-- Function : mark_wine_cellar_returned
-- Arguments: p_id uuid, p_transaction_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.mark_wine_cellar_returned(p_id uuid, p_transaction_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.mark_wine_cellar_returned(p_id uuid, p_transaction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row    wine_cellar;
  v_rti_id uuid;
BEGIN
  SELECT * INTO v_row FROM wine_cellar WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Wine cellar item not found');
  END IF;

  -- Block only if already returned in a DIFFERENT transaction
  IF v_row.status = 'returned' AND v_row.returned_in_transaction_id IS DISTINCT FROM p_transaction_id THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Item is already returned in a different transaction');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM return_transactions WHERE id = p_transaction_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  -- Mark wine cellar item as returned (idempotent — safe to re-run)
  UPDATE wine_cellar SET
    status                     = 'returned',
    returned_in_transaction_id = p_transaction_id,
    returned_at                = COALESCE(returned_at, NOW()),
    updated_at                 = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  -- Insert return_transaction_items row so the item appears in the
  -- warehouse verification page. Idempotent: skip if already present.
  SELECT id INTO v_rti_id
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND wine_cellar_id = p_id
   LIMIT 1;

  IF v_rti_id IS NULL THEN
    INSERT INTO return_transaction_items (
      transaction_id,
      ndc,
      ndc_10,
      proprietary_name,
      manufacturer,
      lot_number,
      serial_number,
      expiration_date,
      quantity,
      standard_price,
      estimated_value,
      is_partial,
      partial_percentage,
      return_status,
      wine_cellar_id,
      scan_source
    ) VALUES (
      p_transaction_id,
      v_row.ndc,
      v_row.ndc_10,
      v_row.product_name,
      v_row.manufacturer,
      v_row.lot_number,
      v_row.serial_number,
      v_row.expiration_date,
      v_row.quantity,
      v_row.standard_price,
      v_row.estimated_value,
      v_row.is_partial,
      v_row.partial_percentage,
      'returnable',
      p_id,
      'manual'
    );

    -- Keep total_items in sync
    UPDATE return_transactions
       SET total_items = COALESCE(total_items, 0) + 1,
           updated_at  = NOW()
     WHERE id = p_transaction_id;
  END IF;

  RETURN jsonb_build_object(
    'error',   false,
    'message', 'Wine cellar item marked as returned',
    'data',    _wc_to_json(v_row)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error',   true,
    'message', SQLERRM,
    'code',    500
  );
END;
$function$;
