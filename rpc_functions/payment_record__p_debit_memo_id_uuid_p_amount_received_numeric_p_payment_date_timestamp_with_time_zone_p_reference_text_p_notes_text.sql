-- Function : payment_record
-- Arguments: p_debit_memo_id uuid, p_amount_received numeric, p_payment_date timestamp with time zone, p_reference text, p_notes text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.payment_record(p_debit_memo_id uuid, p_amount_received numeric, p_payment_date timestamp with time zone, p_reference text, p_notes text) CASCADE;

CREATE OR REPLACE FUNCTION public.payment_record(p_debit_memo_id uuid, p_amount_received numeric, p_payment_date timestamp with time zone DEFAULT now(), p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo   debit_memos;
  v_status TEXT;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  IF p_amount_received IS NULL OR p_amount_received < 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'amount_received must be >= 0');
  END IF;

  -- Any received amount marks the memo as paid; 0 resets to pending.
  IF p_amount_received > 0 THEN
    v_status := 'paid';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE debit_memos SET
    amount_received      = p_amount_received,
    payment_received_at  = p_payment_date,
    payment_reference    = COALESCE(NULLIF(TRIM(p_reference), ''), payment_reference),
    payment_notes        = COALESCE(NULLIF(TRIM(p_notes), ''), payment_notes),
    payment_status       = v_status,
    total_received_value = p_amount_received
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object('error', false, 'data', _debit_memo_to_json(v_memo));
END;
$function$;
