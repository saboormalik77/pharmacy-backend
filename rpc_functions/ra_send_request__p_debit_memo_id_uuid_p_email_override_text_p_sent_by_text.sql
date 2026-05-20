-- Function : ra_send_request
-- Arguments: p_debit_memo_id uuid, p_email_override text, p_sent_by text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_send_request(p_debit_memo_id uuid, p_email_override text, p_sent_by text) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_send_request(p_debit_memo_id uuid, p_email_override text DEFAULT NULL::text, p_sent_by text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo         debit_memos;
  v_dest_email   TEXT;
  v_dest_name    TEXT;
  v_subject      TEXT;
  v_body_preview TEXT;
  v_request      ra_requests;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Look up destination email from reverse_distributors
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
        || '". Please add a contact_email in the reverse_distributors table for this destination, or provide an email_override.');
  END IF;

  IF v_dest_name IS NULL THEN
    v_dest_name := COALESCE(v_memo.destination, '');
  END IF;

  -- Build email subject and preview
  v_subject := 'RA Request — Debit Memo ' || v_memo.memo_number;
  v_body_preview := 'Requesting Return Authorization for ' || v_memo.total_items || ' item(s), '
    || 'Total Ask Value: $' || TRIM(TO_CHAR(v_memo.total_ask_value, '999,999,990.00'))
    || ' — Pharmacy: ' || COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = v_memo.pharmacy_id), '')
    || ' — Destination: ' || COALESCE(v_memo.destination, 'N/A');

  -- Create the RA request log
  INSERT INTO ra_requests (debit_memo_id, request_type, destination_email, destination_name, subject, body_preview, status, sent_by)
  VALUES (p_debit_memo_id, 'initial', v_dest_email, v_dest_name, v_subject, v_body_preview, 'sent', p_sent_by)
  RETURNING * INTO v_request;

  -- Update memo
  UPDATE debit_memos SET
    ra_status = 'requested',
    ra_requested_at = NOW()
  WHERE id = p_debit_memo_id;

  -- Compute tickler = 14 days from now (default follow-up window)
  IF v_memo.tickler_date IS NULL THEN
    UPDATE debit_memos SET tickler_date = (NOW() + INTERVAL '14 days')::date
    WHERE id = p_debit_memo_id;
  END IF;

  -- Re-read the memo for response
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',    _debit_memo_to_json(v_memo),
      'request', _ra_request_to_json(v_request)
    )
  );
END;
$function$;
