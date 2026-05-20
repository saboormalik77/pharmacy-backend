-- Function : update_debit_memo_item_received
-- Arguments: p_item_id uuid, p_received_price numeric
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_debit_memo_item_received(p_item_id uuid, p_received_price numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.update_debit_memo_item_received(p_item_id uuid, p_received_price numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item              debit_memo_items;
  v_memo              debit_memos;
  v_total_received    numeric;
  v_total_ask         numeric;
  v_status            text;
BEGIN
  -- Fetch the item
  SELECT * INTO v_item FROM debit_memo_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo item not found');
  END IF;

  -- Validate amount
  IF p_received_price IS NOT NULL AND p_received_price < 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'received_price must be >= 0');
  END IF;

  -- Update the item's received_price
  UPDATE debit_memo_items
  SET received_price = ROUND(p_received_price, 2)
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Recalculate memo totals from all items
  SELECT 
    COALESCE(SUM(ask_price * quantity), 0),
    COALESCE(SUM(COALESCE(received_price, 0) * quantity), 0)
  INTO v_total_ask, v_total_received
  FROM debit_memo_items
  WHERE debit_memo_id = v_item.debit_memo_id;

  -- Determine payment status
  IF v_total_received >= v_total_ask AND v_total_ask > 0 THEN
    v_status := 'paid';
  ELSIF v_total_received > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  -- Update the debit memo with recalculated totals
  UPDATE debit_memos SET
    amount_received      = v_total_received,
    total_received_value = v_total_received,
    payment_status       = v_status
  WHERE id = v_item.debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'item', jsonb_build_object(
        'id', v_item.id,
        'ndc', v_item.ndc,
        'productName', v_item.product_name,
        'quantity', v_item.quantity,
        'askPrice', v_item.ask_price,
        'receivedPrice', v_item.received_price
      ),
      'memoTotalAsk', v_total_ask,
      'memoTotalReceived', v_total_received,
      'memoPaymentStatus', v_status
    )
  );
END;
$function$;
