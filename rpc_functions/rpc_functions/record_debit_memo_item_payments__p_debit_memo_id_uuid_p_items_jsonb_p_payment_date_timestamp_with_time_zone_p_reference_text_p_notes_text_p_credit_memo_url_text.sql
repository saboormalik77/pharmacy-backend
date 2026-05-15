-- Function : record_debit_memo_item_payments
-- Arguments: p_debit_memo_id uuid, p_items jsonb, p_payment_date timestamp with time zone, p_reference text, p_notes text, p_credit_memo_url text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.record_debit_memo_item_payments(p_debit_memo_id uuid, p_items jsonb, p_payment_date timestamp with time zone, p_reference text, p_notes text, p_credit_memo_url text) CASCADE;

CREATE OR REPLACE FUNCTION public.record_debit_memo_item_payments(p_debit_memo_id uuid, p_items jsonb, p_payment_date timestamp with time zone DEFAULT now(), p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_credit_memo_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo              debit_memos;
  v_item              jsonb;
  v_item_id           uuid;
  v_received_price    numeric;
  v_total_received    numeric;
  v_total_ask         numeric;
  v_status            text;
  v_updated_count     int := 0;
BEGIN
  -- Fetch the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Validate input
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Items array is required');
  END IF;

  -- Update each item's received_price
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item ->> 'itemId')::uuid;
    v_received_price := (v_item ->> 'receivedPrice')::numeric;

    IF v_item_id IS NOT NULL THEN
      UPDATE debit_memo_items
      SET received_price = ROUND(v_received_price, 2)
      WHERE id = v_item_id
        AND debit_memo_id = p_debit_memo_id;

      IF FOUND THEN
        v_updated_count := v_updated_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- Recalculate memo totals from items
  SELECT 
    COALESCE(SUM(ask_price * quantity), 0),
    COALESCE(SUM(COALESCE(received_price, 0) * quantity), 0)
  INTO v_total_ask, v_total_received
  FROM debit_memo_items
  WHERE debit_memo_id = p_debit_memo_id;

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
    payment_status       = v_status,
    payment_received_at  = CASE WHEN v_total_received > 0 THEN COALESCE(p_payment_date, now()) ELSE payment_received_at END,
    payment_reference    = COALESCE(NULLIF(TRIM(p_reference), ''), payment_reference),
    payment_notes        = COALESCE(NULLIF(TRIM(p_notes), ''), payment_notes),
    credit_memo_url      = COALESCE(p_credit_memo_url, credit_memo_url)
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo', _debit_memo_to_json(v_memo),
      'updatedItemsCount', v_updated_count,
      'totalAsk', v_total_ask,
      'totalReceived', v_total_received
    )
  );
END;
$function$;
