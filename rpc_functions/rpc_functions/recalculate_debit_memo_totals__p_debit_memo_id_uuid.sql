-- Function : recalculate_debit_memo_totals
-- Arguments: p_debit_memo_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.recalculate_debit_memo_totals(p_debit_memo_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.recalculate_debit_memo_totals(p_debit_memo_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo              debit_memos;
  v_total_received    numeric;
  v_total_ask         numeric;
  v_status            text;
BEGIN
  -- Fetch the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Calculate totals from items
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

  -- Update the debit memo
  UPDATE debit_memos SET
    amount_received      = v_total_received,
    total_received_value = v_total_received,
    payment_status       = v_status
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memoId', v_memo.id,
      'totalAsk', v_total_ask,
      'totalReceived', v_total_received,
      'paymentStatus', v_status
    )
  );
END;
$function$;
