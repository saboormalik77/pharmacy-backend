-- Migration: Add credit_memo_url column to debit_memos
-- Stores the uploaded credit memo PDF URL when recording a payment.

ALTER TABLE debit_memos
  ADD COLUMN IF NOT EXISTS credit_memo_url TEXT DEFAULT NULL;

-- Update payment_record RPC to accept and save the credit memo URL
CREATE OR REPLACE FUNCTION payment_record(
  p_debit_memo_id    UUID,
  p_amount_received  DECIMAL,
  p_payment_date     TIMESTAMPTZ DEFAULT NOW(),
  p_reference        TEXT DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL,
  p_credit_memo_url  TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  -- Determine payment status based on amounts
  IF p_amount_received >= v_memo.amount_requested AND v_memo.amount_requested > 0 THEN
    v_status := 'paid';
  ELSIF p_amount_received > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE debit_memos SET
    amount_received     = p_amount_received,
    payment_received_at = p_payment_date,
    payment_reference   = COALESCE(NULLIF(TRIM(p_reference), ''), payment_reference),
    payment_notes       = COALESCE(NULLIF(TRIM(p_notes), ''), payment_notes),
    payment_status      = v_status,
    total_received_value = p_amount_received,
    credit_memo_url     = COALESCE(NULLIF(TRIM(p_credit_memo_url), ''), credit_memo_url)
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$$;
