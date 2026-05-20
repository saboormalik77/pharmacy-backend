-- Function : _ra_request_to_json
-- Arguments: r ra_requests
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._ra_request_to_json(r ra_requests) CASCADE;

CREATE OR REPLACE FUNCTION public._ra_request_to_json(r ra_requests)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',               r.id,
    'debitMemoId',      r.debit_memo_id,
    'requestType',      r.request_type,
    'destinationEmail', r.destination_email,
    'destinationName',  r.destination_name,
    'subject',          r.subject,
    'bodyPreview',      r.body_preview,
    'status',           r.status,
    'sentBy',           r.sent_by,
    'sentAt',           r.sent_at,
    'errorMessage',     r.error_message,
    'createdAt',        r.created_at
  );
$function$;
