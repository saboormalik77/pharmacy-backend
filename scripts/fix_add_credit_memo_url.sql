-- Migration: Add credit_memo_url column to debit_memos
-- Stores the uploaded credit memo PDF URL when recording a payment.

ALTER TABLE debit_memos
  ADD COLUMN IF NOT EXISTS credit_memo_url TEXT DEFAULT NULL;

-- Update _debit_memo_to_json to include payment fields and credit_memo_url
CREATE OR REPLACE FUNCTION _debit_memo_to_json(d debit_memos)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                  $1.id,
    'batchId',             $1.batch_id,
    'pharmacyId',          $1.pharmacy_id,
    'pharmacyName',        (SELECT pharmacy_name FROM pharmacy WHERE id = $1.pharmacy_id),
    'memoNumber',          $1.memo_number,
    'destination',         $1.destination,
    'labelerId',           $1.labeler_id,
    'labelerName',         $1.labeler_name,
    'totalItems',          $1.total_items,
    'totalAskValue',       $1.total_ask_value,
    'totalReceivedValue',  $1.total_received_value,
    'raNumber',            $1.ra_number,
    'raRequestedAt',       $1.ra_requested_at,
    'raReceivedAt',        $1.ra_received_at,
    'raStatus',            $1.ra_status,
    'ticklerDate',         $1.tickler_date,
    'baggieManifest',      $1.baggie_manifest,
    'outboundTracking',    $1.outbound_tracking,
    'shippedAt',           $1.shipped_at,
    'paymentStatus',       $1.payment_status,
    'amountRequested',     $1.amount_requested,
    'amountReceived',      $1.amount_received,
    'paymentReceivedAt',   $1.payment_received_at,
    'paymentReference',    $1.payment_reference,
    'paymentNotes',        $1.payment_notes,
    'creditMemoUrl',       $1.credit_memo_url,
    'createdAt',           $1.created_at,
    'updatedAt',           $1.updated_at
  );
$$;

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

  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$$;
