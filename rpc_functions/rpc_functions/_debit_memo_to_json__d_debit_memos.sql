-- Function : _debit_memo_to_json
-- Arguments: d debit_memos
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._debit_memo_to_json(d debit_memos) CASCADE;

CREATE OR REPLACE FUNCTION public._debit_memo_to_json(d debit_memos)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
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
    'paymentReceivedAt',  d.payment_received_at,
    'paymentReference',   d.payment_reference,
    'paymentNotes',       d.payment_notes,
    'creditMemoUrl',      d.credit_memo_url,
    'createdAt',          d.created_at,
    'updatedAt',          d.updated_at
  );
$function$;
