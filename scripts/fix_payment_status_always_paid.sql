-- Migration: Update payment_record to always mark as 'paid' when any amount is received
-- This ensures that debit memos are removed from the unpaid list after recording payment,
-- regardless of whether the received amount matches the requested amount.

-- Ensure credit_memo_url column exists (in case it wasn't added yet)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'debit_memos' AND column_name = 'credit_memo_url'
  ) THEN
    ALTER TABLE debit_memos ADD COLUMN credit_memo_url TEXT DEFAULT NULL;
  END IF;
END $$;

-- Backfill: any existing 'partial' memos that already have amount_received > 0
-- should be promoted to 'paid' so they disappear from the unpaid list.
UPDATE debit_memos
SET payment_status = 'paid'
WHERE payment_status = 'partial'
  AND amount_received > 0;

-- Update payment_record function with new logic
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
  v_result jsonb;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  IF p_amount_received IS NULL OR p_amount_received < 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'amount_received must be >= 0');
  END IF;

  -- Determine payment status based on amounts
  -- Always mark as 'paid' if any amount is received, regardless of whether it matches the requested amount
  IF p_amount_received > 0 THEN
    v_status := 'paid';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE debit_memos SET
    amount_received     = p_amount_received,
    payment_received_at = p_payment_date,
    payment_reference   = p_reference,
    payment_notes       = p_notes,
    payment_status      = v_status,
    total_received_value = p_amount_received,
    credit_memo_url     = COALESCE(p_credit_memo_url, credit_memo_url)
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  -- Use existing _debit_memo_to_json function if it exists, otherwise build json manually
  BEGIN
    SELECT _debit_memo_to_json(v_memo) INTO v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: build JSON manually if _debit_memo_to_json doesn't exist or fails
    SELECT jsonb_build_object(
      'id', v_memo.id,
      'memoNumber', v_memo.memo_number,
      'paymentStatus', v_memo.payment_status,
      'amountRequested', v_memo.amount_requested,
      'amountReceived', v_memo.amount_received,
      'paymentReceivedAt', v_memo.payment_received_at,
      'paymentReference', v_memo.payment_reference,
      'paymentNotes', v_memo.payment_notes,
      'creditMemoUrl', v_memo.credit_memo_url
    ) INTO v_result;
  END;

  RETURN jsonb_build_object('error', false, 'data', v_result);
END;
$$;

