-- ============================================================
-- FCR-34: Change RA Email Strategy
-- ============================================================
-- BEFORE: RA request emails were sent to manufacturer_policies.credit_request_email
-- AFTER:  RA request emails are sent to reverse_distributors.contact_email
--         matched by debit_memos.destination ↔ reverse_distributors.name (case-insensitive)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 4. RPC: ra_send_request (UPDATED)
--    Now resolves email from reverse_distributors based on debit_memo.destination
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_send_request(
  p_debit_memo_id UUID,
  p_sent_by       TEXT DEFAULT NULL,
  p_email_override TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  IF p_email_override IS NOT NULL AND p_email_override <> '' THEN
    v_dest_email := p_email_override;
  ELSE
    -- Look up email from reverse_distributors using debit memo destination
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

  v_subject := 'RA Request — Debit Memo ' || v_memo.memo_number;
  v_body_preview := 'Requesting Return Authorization for ' || v_memo.total_items || ' item(s), '
    || 'Total Ask Value: $' || TRIM(TO_CHAR(v_memo.total_ask_value, '999,999,990.00'))
    || ' — Pharmacy: ' || COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = v_memo.pharmacy_id), '')
    || ' — Destination: ' || COALESCE(v_memo.destination, 'N/A');

  INSERT INTO ra_requests (debit_memo_id, request_type, destination_email, destination_name, subject, body_preview, status, sent_by)
  VALUES (p_debit_memo_id, 'initial', v_dest_email, v_dest_name, v_subject, v_body_preview, 'sent', p_sent_by)
  RETURNING * INTO v_request;

  UPDATE debit_memos SET
    ra_status = 'requested',
    ra_requested_at = NOW()
  WHERE id = p_debit_memo_id;

  IF v_memo.tickler_date IS NULL THEN
    UPDATE debit_memos SET tickler_date = (NOW() + INTERVAL '14 days')::date
    WHERE id = p_debit_memo_id;
  END IF;

  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',    _debit_memo_to_json(v_memo),
      'request', _ra_request_to_json(v_request)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RPC: ra_resend_request (UPDATED)
--    Now resolves email from reverse_distributors
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_resend_request(
  p_debit_memo_id  UUID,
  p_sent_by        TEXT DEFAULT NULL,
  p_email_override TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_memo         debit_memos;
  v_dest_email   TEXT;
  v_dest_name    TEXT;
  v_subject      TEXT;
  v_body_preview TEXT;
  v_request      ra_requests;
  v_count        INTEGER;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  SELECT COUNT(*) INTO v_count FROM ra_requests WHERE debit_memo_id = p_debit_memo_id;

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

  IF v_dest_name IS NULL THEN
    v_dest_name := COALESCE(v_memo.labeler_name, '');
  END IF;

  v_subject := 'REMINDER: RA Request — Debit Memo ' || v_memo.memo_number || ' (Follow-up #' || v_count || ')';
  v_body_preview := 'Follow-up RA request for ' || v_memo.total_items || ' item(s), '
    || 'Total Ask Value: $' || TRIM(TO_CHAR(v_memo.total_ask_value, '999,999,990.00'))
    || ' — Original request sent: ' || COALESCE(TO_CHAR(v_memo.ra_requested_at, 'YYYY-MM-DD'), 'N/A');

  INSERT INTO ra_requests (debit_memo_id, request_type, destination_email, destination_name, subject, body_preview, status, sent_by)
  VALUES (p_debit_memo_id, 'reminder', v_dest_email, v_dest_name, v_subject, v_body_preview, 'sent', p_sent_by)
  RETURNING * INTO v_request;

  UPDATE debit_memos SET tickler_date = (NOW() + INTERVAL '7 days')::date
  WHERE id = p_debit_memo_id;

  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',    _debit_memo_to_json(v_memo),
      'request', _ra_request_to_json(v_request)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 12. RPC: ra_generate_request_email (UPDATED)
--     Now resolves email from reverse_distributors
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_generate_request_email(
  p_debit_memo_id  UUID,
  p_email_override TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_memo       debit_memos;
  v_pharm_name TEXT;
  v_pharm_addr TEXT;
  v_dest_email TEXT;
  v_dest_name  TEXT;
  v_items      jsonb;
  v_subject    TEXT;
  v_body       TEXT;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Pharmacy info
  SELECT pharmacy_name,
    CONCAT_WS(', ',
      NULLIF(TRIM(physical_address->>'street'), ''),
      NULLIF(TRIM(physical_address->>'city'), ''),
      NULLIF(TRIM(physical_address->>'state'), ''),
      NULLIF(TRIM(physical_address->>'zip'), '')
    )
  INTO v_pharm_name, v_pharm_addr
  FROM pharmacy WHERE id = v_memo.pharmacy_id;

  -- Destination email: override > reverse_distributors lookup
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

  -- Line items
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ndc', di.ndc,
    'productName', di.product_name,
    'quantity', di.quantity,
    'askPrice', di.ask_price,
    'lotNumber', di.lot_number,
    'expirationDate', di.expiration_date
  ) ORDER BY di.product_name), '[]'::jsonb)
  INTO v_items
  FROM debit_memo_items di WHERE di.debit_memo_id = p_debit_memo_id;

  v_subject := 'Return Authorization Request — ' || v_memo.memo_number;

  v_body := 'Dear ' || COALESCE(v_dest_name, 'Returns Department') || ','
    || E'\n\n' || 'We are requesting Return Authorization for the following items:'
    || E'\n\n' || 'Debit Memo: ' || v_memo.memo_number
    || E'\n' || 'Pharmacy: ' || COALESCE(v_pharm_name, '')
    || E'\n' || 'Address: ' || COALESCE(v_pharm_addr, '')
    || E'\n' || 'Items: ' || v_memo.total_items
    || E'\n' || 'Total Ask Value: $' || TRIM(TO_CHAR(v_memo.total_ask_value, '999,999,990.00'))
    || E'\n\n' || 'Please respond with the Return Authorization number at your earliest convenience.'
    || E'\n\n' || 'Thank you,'
    || E'\n' || 'PharmaCollect Returns Department';

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'to',           v_dest_email,
      'toName',       v_dest_name,
      'subject',      v_subject,
      'body',         v_body,
      'memoNumber',   v_memo.memo_number,
      'pharmacyName', COALESCE(v_pharm_name, ''),
      'destination',  v_memo.destination,
      'labelerName',  v_memo.labeler_name,
      'totalItems',   v_memo.total_items,
      'totalAskValue',v_memo.total_ask_value,
      'items',        v_items
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- payment_send_reminder (UPDATED from fcr_17)
--    Payment reminders also go to reverse distributor
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payment_send_reminder(
  p_debit_memo_id UUID,
  p_sent_by       TEXT DEFAULT NULL,
  p_email_override TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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
  VALUES (p_debit_memo_id, 'payment_reminder', v_dest_email, v_dest_name, v_subject, v_body, 'sent', p_sent_by)
  RETURNING * INTO v_request;

  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',    _debit_memo_to_json(v_memo),
      'request', _ra_request_to_json(v_request)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 13. RPC: ra_generate_reminder_email (UPDATED)
--     Now resolves email from reverse_distributors
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_generate_reminder_email(
  p_debit_memo_id  UUID,
  p_email_override TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
$$;