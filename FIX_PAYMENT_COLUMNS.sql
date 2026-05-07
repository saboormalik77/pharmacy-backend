-- ================================================================
-- SIMPLE FIX: Missing Payment Columns in debit_memos Table
-- ================================================================
-- This script adds the missing payment-related columns to fix the error:
-- column "payment_received_at" of relation "debit_memos" does not exist
-- ================================================================

-- Add missing payment columns to debit_memos table
ALTER TABLE public.debit_memos 
ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS payment_notes text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS amount_requested numeric(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS amount_received numeric(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS credit_memo_url text;

-- Add constraint for payment_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'debit_memos_payment_status_check'
  ) THEN
    ALTER TABLE public.debit_memos 
    ADD CONSTRAINT debit_memos_payment_status_check 
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled'));
  END IF;
END $$;

-- Create payment_record function (basic version that the API likely expects)
CREATE OR REPLACE FUNCTION public.payment_record(
  p_debit_memo_id uuid, 
  p_amount_received numeric, 
  p_payment_date timestamp with time zone DEFAULT now(), 
  p_reference text DEFAULT NULL::text, 
  p_notes text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
    updated_at          = NOW()
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id', v_memo.id,
      'memoNumber', v_memo.memo_number,
      'paymentStatus', v_memo.payment_status,
      'amountRequested', v_memo.amount_requested,
      'amountReceived', v_memo.amount_received,
      'paymentReceivedAt', v_memo.payment_received_at,
      'paymentReference', v_memo.payment_reference,
      'paymentNotes', v_memo.payment_notes,
      'updatedAt', v_memo.updated_at
    )
  );
END;
$$;

-- Set permissions
ALTER FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO anon;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO service_role;

-- Verify the fix
SELECT 'Payment recording fix applied successfully!' as status;