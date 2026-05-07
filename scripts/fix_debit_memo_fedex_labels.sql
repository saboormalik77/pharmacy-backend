-- Migration: Add fedex_labels column to debit_memos for label persistence
-- This allows labels to be printed after the modal session is closed.

ALTER TABLE debit_memos
  ADD COLUMN IF NOT EXISTS fedex_labels JSONB DEFAULT NULL;

-- Update the _debit_memo_to_json helper to include fedex_labels
CREATE OR REPLACE FUNCTION _debit_memo_to_json(d debit_memos)
RETURNS JSONB
LANGUAGE SQL STABLE AS $$
  SELECT jsonb_build_object(
    'id',                 d.id,
    'batchId',            d.batch_id,
    'pharmacyId',         d.pharmacy_id,
    'pharmacyName',       COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), ''),
    'memoNumber',         d.memo_number,
    'destination',        d.destination,
    'labelerId',          d.labeler_id,
    'labelerName',        d.labeler_name,
    'totalItems',         d.total_items,
    'totalAskValue',      d.total_ask_value,
    'totalReceivedValue', d.total_received_value,
    'raNumber',           d.ra_number,
    'raRequestedAt',      d.ra_requested_at,
    'raReceivedAt',       d.ra_received_at,
    'raStatus',           d.ra_status,
    'ticklerDate',        d.tickler_date,
    'baggieManifest',     d.baggie_manifest,
    'outboundTracking',   d.outbound_tracking,
    'shippedAt',          d.shipped_at,
    'paymentStatus',      d.payment_status,
    'amountRequested',    d.amount_requested,
    'amountReceived',     d.amount_received,
    'fedexLabels',        d.fedex_labels,
    'createdAt',          d.created_at,
    'updatedAt',          d.updated_at
  );
$$;
