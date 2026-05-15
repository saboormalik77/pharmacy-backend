-- Function : admin_set_item_standard_price
-- Arguments: p_item_id uuid, p_price numeric
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.admin_set_item_standard_price(p_item_id uuid, p_price numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_set_item_standard_price(p_item_id uuid, p_price numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item                  return_transaction_items;
  v_qty                   INTEGER;
  v_is_partial            BOOLEAN;
  v_partial_percentage    NUMERIC;
  v_est_value             NUMERIC;
  v_est_store_price       NUMERIC;
  v_est_store_value       NUMERIC;
  v_returnable_total      NUMERIC;
  v_non_returnable_total  NUMERIC;
BEGIN
  IF p_price IS NULL OR p_price < 0 THEN
    RETURN jsonb_build_object(
      'error', true, 'code', 400,
      'message', 'standardPrice must be a non-negative number'
    );
  END IF;

  SELECT * INTO v_item
    FROM return_transaction_items
   WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  v_qty                := COALESCE(v_item.quantity, 1);
  v_is_partial         := COALESCE(v_item.is_partial, FALSE);
  v_partial_percentage := v_item.partial_percentage;

  IF v_is_partial AND v_partial_percentage IS NOT NULL THEN
    v_est_value := p_price * v_qty * (v_partial_percentage / 100);
  ELSE
    v_est_value := p_price * v_qty;
  END IF;

  v_est_value       := ROUND(v_est_value, 2);
  v_est_store_price := ROUND(p_price * 0.70, 2);
  v_est_store_value := ROUND(v_est_value * 0.70, 2);

  -- Opt into the trigger escape hatch for this transaction only.
  PERFORM set_config('app.allow_admin_price_update', 'true', true);

  UPDATE return_transaction_items
     SET standard_price        = p_price,
         estimated_value       = v_est_value,
         estimated_store_price = v_est_store_price,
         estimated_store_value = v_est_store_value,
         updated_at            = NOW()
   WHERE id = p_item_id
   RETURNING * INTO v_item;

  -- Re-aggregate parent transaction totals.
  SELECT COALESCE(SUM(estimated_value), 0)
    INTO v_returnable_total
    FROM return_transaction_items
   WHERE transaction_id = v_item.transaction_id
     AND return_status  = 'returnable';

  SELECT COALESCE(SUM(estimated_value), 0)
    INTO v_non_returnable_total
    FROM return_transaction_items
   WHERE transaction_id = v_item.transaction_id
     AND return_status  = 'non_returnable';

  UPDATE return_transactions
     SET total_returnable_value     = v_returnable_total,
         total_non_returnable_value = v_non_returnable_total,
         updated_at                 = NOW()
   WHERE id = v_item.transaction_id;

  -- Clear the flag for any subsequent statements in the caller's transaction.
  PERFORM set_config('app.allow_admin_price_update', 'false', true);

  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
END;
$function$;
