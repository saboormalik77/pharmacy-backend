-- Function : ra_generate_reminder_email
-- Arguments: p_debit_memo_id uuid, p_email_override text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_generate_reminder_email(p_debit_memo_id uuid, p_email_override text) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_generate_reminder_email(p_debit_memo_id uuid, p_email_override text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_memo         debit_memos;
  v_pharm_name   TEXT;
  v_dest_email   TEXT;
  v_dest_name    TEXT;
  v_request_count INTEGER;
  v_subject      TEXT;
  v_body         TEXT;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  SELECT pharmacy_name INTO v_pharm_name FROM pharmacy WHERE id = v_memo.pharmacy_id;

  SELECT COUNT(*) INTO v_request_count FROM ra_requests WHERE debit_memo_id = p_debit_memo_id;

  IF p_email_override IS NOT NULL AND p_email_override <> '' THEN
    v_dest_email := p_email_override;
    v_dest_name  := COALESCE(v_memo.labeler_name, '');
  ELSE
    SELECT rd.contact_email, rd.name
      INTO v_dest_email, v_dest_name
      FROM reverse_distributors rd
      WHERE LOWER(rd.name) = LOWER(v_memo.destination)
        AND rd.is_active = true
      LIMIT 1;
  END IF;

  v_subject := 'REMINDER: Return Authorization Request — ' || v_memo.memo_number || ' (Follow-up #' || v_request_count || ')';

  v_body := 'Dear ' || COALESCE(v_dest_name, 'Returns Department') || ','
    || E'\n\n' || 'This is a follow-up regarding our Return Authorization request for Debit Memo ' || v_memo.memo_number || '.'
    || E'\n' || 'Original request was sent on: ' || COALESCE(TO_CHAR(v_memo.ra_requested_at, 'Month DD, YYYY'), 'N/A')
    || E'\n\n' || 'Pharmacy: ' || COALESCE(v_pharm_name, '')
    || E'\n' || 'Items: ' || v_memo.total_items
    || E'\n' || 'Total Ask Value: $' || TRIM(TO_CHAR(v_memo.total_ask_value, '999,999,990.00'))
    || E'\n\n' || 'We kindly request that you send us the RA number at your earliest convenience.'
    || E'\n\n' || 'Thank you,'
    || E'\n' || 'PharmaCollect Returns Department';

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'to',            v_dest_email,
      'toName',        v_dest_name,
      'subject',       v_subject,
      'body',          v_body,
      'memoNumber',    v_memo.memo_number,
      'pharmacyName',  COALESCE(v_pharm_name, ''),
      'requestCount',  v_request_count,
      'originalDate',  v_memo.ra_requested_at
    )
  );
END;
$function$;
