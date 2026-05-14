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
    'id',                  $1.id,
    'batchId',             $1.batch_id,
    'batchName',           (SELECT b.batch_name  FROM return_batches b WHERE b.id = $1.batch_id),
    'batchMonth',          (SELECT b.batch_month FROM return_batches b WHERE b.id = $1.batch_id),
    'pharmacyId',          $1.pharmacy_id,
    'pharmacyName',        COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = $1.pharmacy_id), ''),
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
    'createdAt',           $1.created_at,
    'updatedAt',           $1.updated_at
  );
$function$;
