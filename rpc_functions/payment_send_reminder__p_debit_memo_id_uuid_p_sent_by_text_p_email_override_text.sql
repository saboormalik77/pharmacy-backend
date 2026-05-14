-- Function : payment_send_reminder
-- Arguments: p_debit_memo_id uuid, p_sent_by text, p_email_override text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.payment_send_reminder(p_debit_memo_id uuid, p_sent_by text, p_email_override text) CASCADE;

CREATE OR REPLACE FUNCTION public.payment_send_reminder(p_debit_memo_id uuid, p_sent_by text DEFAULT NULL::text, p_email_override text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo       debit_memos;
  v_dest_email TEXT;
  v_dest_name  TEXT;
  v_subject    TEXT;
  v_body       TEXT;
  v_request    ra_requests;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  IF v_memo.payment_status = 'paid' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'This debit memo is already fully paid.');
  END IF;

  IF p_email_override IS NOT NULL AND p_email_override <> '' THEN
    v_dest_email := p_email_override;
  ELSE
    SELECT rd.contact_email, rd.name
      INTO v_dest_email, v_dest_name
      FROM reverse_distributors rd
      WHERE LOWER(rd.name) = LOWER(v_memo.destination)
        AND rd.is_active = true
      LIMIT 1;
  END IF;

  IF v_dest_email IS NULL OR v_dest_email = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'No contact email found for destination "' || COALESCE(v_memo.destination, 'NULL')
        || '". Add a contact_email in reverse_distributors or provide email_override.');
  END IF;

  v_dest_name := COALESCE(v_dest_name, v_memo.labeler_name, '');
  v_subject := 'Payment Reminder — Debit Memo ' || v_memo.memo_number;
  v_body := 'Outstanding amount: $' || TRIM(TO_CHAR(v_memo.amount_requested - v_memo.amount_received, '999,999,990.00'))
    || ' — Original ask: $' || TRIM(TO_CHAR(v_memo.amount_requested, '999,999,990.00'))
    || ' — Pharmacy: ' || COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = v_memo.pharmacy_id), '');

  INSERT INTO ra_requests (debit_memo_id, request_type, destination_email, destination_name, subject, body_preview, status, sent_by)
  VALUES (p_debit_memo_id, 'reminder', v_dest_email, v_dest_name, v_subject, v_body, 'sent', p_sent_by)
  RETURNING * INTO v_request;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',    _debit_memo_to_json(v_memo),
      'request', _ra_request_to_json(v_request)
    )
  );
END;
$function$;
