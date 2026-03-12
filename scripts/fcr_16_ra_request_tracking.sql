-- ============================================================
-- FCR Module 11 — RA Request & Tracking
-- Run this in Supabase SQL Editor
--
-- Contents:
--   1. ra_requests table
--   2. Add ra_status column to debit_memos
--   3. Helper: _ra_request_to_json
--   4. RPC: ra_send_request (record RA request sent)
--   5. RPC: ra_receive (record RA received)
--   6. RPC: ra_resend_request (record RA resend / reminder)
--   7. RPC: ra_list_tracking (dashboard of all RA statuses)
--   8. RPC: ra_list_outstanding (pending RAs)
--   9. RPC: ra_list_overdue (RAs past tickler date)
--  10. RPC: ra_ship_debit_memo (record outbound shipment)
--  11. RPC: ra_list_outbound_shipments (list shipped memos)
--  12. RPC: ra_generate_request_email (build email template data)
--  13. RPC: ra_generate_reminder_email (build reminder template data)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. ra_requests table — logs each RA request attempt
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ra_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_memo_id     UUID NOT NULL REFERENCES debit_memos(id) ON DELETE CASCADE,
  request_type      TEXT NOT NULL DEFAULT 'initial'
    CHECK (request_type IN ('initial', 'reminder', 'resend')),
  destination_email TEXT,
  destination_name  TEXT,
  subject           TEXT,
  body_preview      TEXT,
  status            TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_by           TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rar_debit_memo ON ra_requests(debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_rar_status     ON ra_requests(status);
CREATE INDEX IF NOT EXISTS idx_rar_sent_at    ON ra_requests(sent_at);

ALTER TABLE ra_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON ra_requests;
CREATE POLICY "Allow all access via service role" ON ra_requests
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2. Add ra_status column to debit_memos (if not exists)
--    Values: pending, requested, received, shipped, overdue
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debit_memos' AND column_name = 'ra_status'
  ) THEN
    ALTER TABLE debit_memos ADD COLUMN ra_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (ra_status IN ('pending', 'requested', 'received', 'shipped', 'overdue'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dm_ra_status ON debit_memos(ra_status);


-- ────────────────────────────────────────────────────────────
-- 3. Helper: _ra_request_to_json
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _ra_request_to_json(r ra_requests)
RETURNS jsonb LANGUAGE sql STABLE AS $$
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
$$;


-- ────────────────────────────────────────────────────────────
-- Update _debit_memo_to_json to include ra_status
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _debit_memo_to_json(d debit_memos)
RETURNS jsonb LANGUAGE sql STABLE AS $$
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
    'createdAt',          d.created_at,
    'updatedAt',          d.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 4. RPC: ra_send_request
--    Records an RA request was sent for a debit memo.
--    Looks up destination email from manufacturer_policies.
--    Sets debit_memo.ra_status='requested', ra_requested_at=NOW()
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

  -- Look up destination email from manufacturer_policies
  IF p_email_override IS NOT NULL AND p_email_override <> '' THEN
    v_dest_email := p_email_override;
  ELSE
    SELECT credit_request_email, main_contact
      INTO v_dest_email, v_dest_name
      FROM manufacturer_policies
      WHERE labeler_id = v_memo.labeler_id
      LIMIT 1;
  END IF;

  IF v_dest_email IS NULL OR v_dest_email = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'No email found for labeler ' || COALESCE(v_memo.labeler_id, '?') || '. Set credit_request_email in manufacturer_policies or provide email_override.');
  END IF;

  IF v_dest_name IS NULL THEN
    v_dest_name := COALESCE(v_memo.labeler_name, '');
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
$$;


-- ────────────────────────────────────────────────────────────
-- 5. RPC: ra_receive
--    Records that an RA was received for a debit memo.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_receive(
  p_debit_memo_id UUID,
  p_ra_number     TEXT,
  p_pdf_url       TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_memo debit_memos;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  IF p_ra_number IS NULL OR TRIM(p_ra_number) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'RA number is required');
  END IF;

  UPDATE debit_memos SET
    ra_number = TRIM(p_ra_number),
    ra_received_at = NOW(),
    ra_status = 'received'
  WHERE id = p_debit_memo_id;

  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RPC: ra_resend_request
--    Logs a reminder / resend for an existing RA request.
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

  -- Count existing requests
  SELECT COUNT(*) INTO v_count FROM ra_requests WHERE debit_memo_id = p_debit_memo_id;

  IF p_email_override IS NOT NULL AND p_email_override <> '' THEN
    v_dest_email := p_email_override;
  ELSE
    SELECT credit_request_email, main_contact
      INTO v_dest_email, v_dest_name
      FROM manufacturer_policies
      WHERE labeler_id = v_memo.labeler_id
      LIMIT 1;
  END IF;

  IF v_dest_email IS NULL OR v_dest_email = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'No email found for labeler. Provide email_override.');
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

  -- Bump tickler date forward by 7 days
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
-- 7. RPC: ra_list_tracking
--    Dashboard of all debit memos with RA-related fields.
--    Filterable by ra_status, destination, date range.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_list_tracking(
  p_ra_status   TEXT DEFAULT NULL,
  p_destination TEXT DEFAULT NULL,
  p_date_from   DATE DEFAULT NULL,
  p_date_to     DATE DEFAULT NULL,
  p_search      TEXT DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM debit_memos d
  WHERE (p_ra_status IS NULL OR d.ra_status = p_ra_status)
    AND (p_destination IS NULL OR d.destination = p_destination)
    AND (p_date_from IS NULL OR d.ra_requested_at >= p_date_from)
    AND (p_date_to IS NULL OR d.ra_requested_at <= (p_date_to + INTERVAL '1 day'))
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.ra_number, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY
    CASE d.ra_status
      WHEN 'overdue' THEN 1
      WHEN 'requested' THEN 2
      WHEN 'pending' THEN 3
      WHEN 'received' THEN 4
      WHEN 'shipped' THEN 5
    END,
    d.tickler_date NULLS LAST
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE (p_ra_status IS NULL OR d.ra_status = p_ra_status)
      AND (p_destination IS NULL OR d.destination = p_destination)
      AND (p_date_from IS NULL OR d.ra_requested_at >= p_date_from)
      AND (p_date_to IS NULL OR d.ra_requested_at <= (p_date_to + INTERVAL '1 day'))
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.ra_number, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY
      CASE d.ra_status
        WHEN 'overdue' THEN 1
        WHEN 'requested' THEN 2
        WHEN 'pending' THEN 3
        WHEN 'received' THEN 4
        WHEN 'shipped' THEN 5
      END,
      d.tickler_date NULLS LAST
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', jsonb_build_object(
      'pending',   (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'pending'),
      'requested', (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'requested'),
      'received',  (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'received'),
      'shipped',   (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'shipped'),
      'overdue',   (SELECT COUNT(*) FROM debit_memos WHERE ra_status = 'overdue'
                     OR (ra_status = 'requested' AND tickler_date IS NOT NULL AND tickler_date < CURRENT_DATE))
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. RPC: ra_list_outstanding
--    Pending RAs — requested but not received, not yet overdue
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_list_outstanding(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM debit_memos d
  WHERE d.ra_status = 'requested'
    AND d.ra_received_at IS NULL
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.tickler_date NULLS LAST, d.ra_requested_at), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.ra_status = 'requested'
      AND d.ra_received_at IS NULL
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY d.tickler_date NULLS LAST, d.ra_requested_at
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. RPC: ra_list_overdue
--    RAs past tickler date and not yet received
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_list_overdue(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM debit_memos d
  WHERE d.ra_received_at IS NULL
    AND d.ra_status IN ('requested', 'overdue')
    AND d.tickler_date IS NOT NULL
    AND d.tickler_date < CURRENT_DATE
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.tickler_date, d.ra_requested_at), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.ra_received_at IS NULL
      AND d.ra_status IN ('requested', 'overdue')
      AND d.tickler_date IS NOT NULL
      AND d.tickler_date < CURRENT_DATE
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY d.tickler_date, d.ra_requested_at
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 10. RPC: ra_ship_debit_memo
--     Records outbound shipment to destination processor
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_ship_debit_memo(
  p_debit_memo_id    UUID,
  p_outbound_tracking TEXT,
  p_shipped_at       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_memo debit_memos;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  IF v_memo.ra_number IS NULL OR TRIM(v_memo.ra_number) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot ship without an RA number. Record RA received first.');
  END IF;

  IF p_outbound_tracking IS NULL OR TRIM(p_outbound_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Outbound tracking number is required');
  END IF;

  UPDATE debit_memos SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at = p_shipped_at,
    ra_status = 'shipped'
  WHERE id = p_debit_memo_id;

  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 11. RPC: ra_list_outbound_shipments
--     Lists debit memos that have been shipped
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ra_list_outbound_shipments(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM debit_memos d
  WHERE d.shipped_at IS NOT NULL
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.outbound_tracking, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.shipped_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.shipped_at IS NOT NULL
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.outbound_tracking, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY d.shipped_at DESC
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 12. RPC: ra_generate_request_email
--     Builds the full email template data for an RA request.
--     Returns: to, subject, html body, debit memo details.
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
      NULLIF(TRIM(address->>'street'), ''),
      NULLIF(TRIM(address->>'city'), ''),
      NULLIF(TRIM(address->>'state'), ''),
      NULLIF(TRIM(address->>'zip'), '')
    )
  INTO v_pharm_name, v_pharm_addr
  FROM pharmacy WHERE id = v_memo.pharmacy_id;

  -- Destination email
  IF p_email_override IS NOT NULL AND p_email_override <> '' THEN
    v_dest_email := p_email_override;
    v_dest_name  := COALESCE(v_memo.labeler_name, '');
  ELSE
    SELECT credit_request_email, COALESCE(main_contact, manufacturer_name)
      INTO v_dest_email, v_dest_name
      FROM manufacturer_policies
      WHERE labeler_id = v_memo.labeler_id
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
-- 13. RPC: ra_generate_reminder_email
--     Builds email template data for an RA reminder.
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
    SELECT credit_request_email, COALESCE(main_contact, manufacturer_name)
      INTO v_dest_email, v_dest_name
      FROM manufacturer_policies
      WHERE labeler_id = v_memo.labeler_id
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
