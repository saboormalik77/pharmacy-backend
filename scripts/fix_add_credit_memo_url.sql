-- Migration: Add credit_memo_url column to debit_memos
-- Stores the uploaded credit memo PDF URL when recording a payment.

ALTER TABLE debit_memos
  ADD COLUMN IF NOT EXISTS credit_memo_url TEXT DEFAULT NULL;

-- Update _debit_memo_to_json to include payment fields and credit_memo_url
CREATE OR REPLACE FUNCTION _debit_memo_to_json(d debit_memos)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                  d.id,
    'batchId',             d.batch_id,
    'pharmacyId',          d.pharmacy_id,
    'pharmacyName',        (SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id),
    'memoNumber',          d.memo_number,
    'destination',         d.destination,
    'labelerId',           d.labeler_id,
    'labelerName',         d.labeler_name,
    'totalItems',          d.total_items,
    'totalAskValue',       d.total_ask_value,
    'totalReceivedValue',  d.total_received_value,
    'raNumber',            d.ra_number,
    'raRequestedAt',       d.ra_requested_at,
    'raReceivedAt',        d.ra_received_at,
    'raStatus',            d.ra_status,
    'ticklerDate',         d.tickler_date,
    'baggieManifest',      d.baggie_manifest,
    'outboundTracking',    d.outbound_tracking,
    'shippedAt',           d.shipped_at,
    'paymentStatus',       d.payment_status,
    'amountRequested',     d.amount_requested,
    'amountReceived',      d.amount_received,
    'paymentReceivedAt',   d.payment_received_at,
    'paymentReference',    d.payment_reference,
    'paymentNotes',        d.payment_notes,
    'fedexLabels',         d.fedex_labels,
    'creditMemoUrl',       d.credit_memo_url,
    'shipmentGroupId',     d.shipment_group_id,
    'createdAt',           d.created_at,
    'updatedAt',           d.updated_at
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
