-- ============================================================
-- FCR Module 12 — Manufacturer Payment Tracking
-- Run this in Supabase SQL Editor
--
-- Contents:
--   1. Add payment columns to debit_memos
--   2. Update _debit_memo_to_json helper
--   3. RPC: payment_record (record a payment for a debit memo)
--   4. RPC: payment_list_unpaid (list unpaid debit memos)
--   5. RPC: payment_send_reminder (log payment reminder)
--   6. RPC: payment_ask_vs_received (ask vs received analytics)
--   7. RPC: payment_manufacturer_summary (per-manufacturer stats)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add payment tracking columns to debit_memos
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debit_memos' AND column_name = 'payment_received_at'
  ) THEN
    ALTER TABLE debit_memos ADD COLUMN payment_received_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debit_memos' AND column_name = 'payment_reference'
  ) THEN
    ALTER TABLE debit_memos ADD COLUMN payment_reference TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debit_memos' AND column_name = 'payment_notes'
  ) THEN
    ALTER TABLE debit_memos ADD COLUMN payment_notes TEXT;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. Update _debit_memo_to_json to include new payment columns
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
    'paymentReceivedAt',  d.payment_received_at,
    'paymentReference',   d.payment_reference,
    'paymentNotes',       d.payment_notes,
    'createdAt',          d.created_at,
    'updatedAt',          d.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 3. RPC: payment_record
--    Records a payment received for a debit memo.
--    Updates amount_received, payment_status, timestamps.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payment_record(
  p_debit_memo_id    UUID,
  p_amount_received  DECIMAL,
  p_payment_date     TIMESTAMPTZ DEFAULT NOW(),
  p_reference        TEXT DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL
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
    payment_reference   = COALESCE(NULLIF(TRIM(p_reference), ''), payment_reference),
    payment_notes       = COALESCE(NULLIF(TRIM(p_notes), ''), payment_notes),
    payment_status      = v_status,
    total_received_value = p_amount_received
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. RPC: payment_list_unpaid
--    Lists debit memos that are not fully paid.
--    Includes days outstanding calculation.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payment_list_unpaid(
  p_manufacturer TEXT DEFAULT NULL,
  p_destination  TEXT DEFAULT NULL,
  p_search       TEXT DEFAULT NULL,
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
  v_total_outstanding DECIMAL(12,2);
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*), COALESCE(SUM(d.amount_requested - d.amount_received), 0)
    INTO v_total, v_total_outstanding
  FROM debit_memos d
  WHERE d.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
         OR d.labeler_id = p_manufacturer)
    AND (p_destination IS NULL OR d.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(
    _debit_memo_to_json(d) || jsonb_build_object(
      'daysOutstanding', EXTRACT(DAY FROM NOW() - COALESCE(d.ra_requested_at, d.created_at))::integer,
      'outstandingAmount', d.amount_requested - d.amount_received
    )
    ORDER BY COALESCE(d.ra_requested_at, d.created_at)
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.payment_status IN ('pending', 'partial')
      AND (p_manufacturer IS NULL OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
           OR d.labeler_id = p_manufacturer)
      AND (p_destination IS NULL OR d.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), '')) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY COALESCE(d.ra_requested_at, d.created_at)
    LIMIT p_limit OFFSET v_offset
  ) d;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', jsonb_build_object(
      'totalUnpaid', v_total,
      'totalOutstanding', v_total_outstanding
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. RPC: payment_send_reminder
--    Logs a payment reminder for a debit memo.
--    Re-uses ra_requests table with request_type='payment_reminder'.
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
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RPC: payment_ask_vs_received
--    Ask vs Received analytics grouped by manufacturer + period.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payment_ask_vs_received(
  p_group_by TEXT DEFAULT 'manufacturer',
  p_period   TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_rows jsonb;
  v_totals jsonb;
BEGIN
  IF p_group_by = 'manufacturer' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'totalAskValue')::decimal DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
        'labelerId',      d.labeler_id,
        'labelerName',    COALESCE(d.labeler_name, ''),
        'memoCount',      COUNT(*),
        'totalItems',     SUM(d.total_items),
        'totalAskValue',  SUM(d.amount_requested),
        'totalReceived',  SUM(d.amount_received),
        'difference',     SUM(d.amount_requested) - SUM(d.amount_received),
        'payPercent',     CASE WHEN SUM(d.amount_requested) > 0
                            THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                            ELSE 0 END,
        'paidCount',      SUM(CASE WHEN d.payment_status = 'paid' THEN 1 ELSE 0 END),
        'unpaidCount',    SUM(CASE WHEN d.payment_status IN ('pending', 'partial') THEN 1 ELSE 0 END)
      ) AS row_data
      FROM debit_memos d
      WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period)
      GROUP BY d.labeler_id, d.labeler_name
    ) sub;
  ELSE
    -- Group by month
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'period'), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
        'period',         TO_CHAR(d.created_at, 'YYYY-MM'),
        'memoCount',      COUNT(*),
        'totalAskValue',  SUM(d.amount_requested),
        'totalReceived',  SUM(d.amount_received),
        'difference',     SUM(d.amount_requested) - SUM(d.amount_received),
        'payPercent',     CASE WHEN SUM(d.amount_requested) > 0
                            THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                            ELSE 0 END
      ) AS row_data
      FROM debit_memos d
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
    ) sub;
  END IF;

  -- Overall totals
  SELECT jsonb_build_object(
    'totalMemos',      COUNT(*),
    'totalAskValue',   COALESCE(SUM(d.amount_requested), 0),
    'totalReceived',   COALESCE(SUM(d.amount_received), 0),
    'totalDifference', COALESCE(SUM(d.amount_requested) - SUM(d.amount_received), 0),
    'overallPayPercent', CASE WHEN SUM(d.amount_requested) > 0
                           THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                           ELSE 0 END
  ) INTO v_totals
  FROM debit_memos d
  WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period);

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'totals', v_totals
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. RPC: payment_manufacturer_summary
--    Per-manufacturer payment stats: unpaid count, outstanding,
--    paid amount, avg pay %, avg days to pay.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payment_manufacturer_summary(
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

  SELECT COUNT(DISTINCT labeler_id) INTO v_total
  FROM debit_memos d
  WHERE (p_search IS NULL OR (
    LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
    OR d.labeler_id LIKE '%' || p_search || '%'
  ));

  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'outstandingAmount')::decimal DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'labelerId',         d.labeler_id,
      'labelerName',       COALESCE(MAX(d.labeler_name), ''),
      'totalMemos',        COUNT(*),
      'unpaidMemos',       SUM(CASE WHEN d.payment_status IN ('pending', 'partial') THEN 1 ELSE 0 END),
      'paidMemos',         SUM(CASE WHEN d.payment_status = 'paid' THEN 1 ELSE 0 END),
      'disputedMemos',     SUM(CASE WHEN d.payment_status = 'disputed' THEN 1 ELSE 0 END),
      'totalAskValue',     SUM(d.amount_requested),
      'totalPaidAmount',   SUM(d.amount_received),
      'outstandingAmount', SUM(d.amount_requested) - SUM(d.amount_received),
      'averagePayPercent', CASE WHEN SUM(d.amount_requested) > 0
                             THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                             ELSE 0 END,
      'averageDaysToPay',  COALESCE(
        ROUND(AVG(
          CASE WHEN d.payment_received_at IS NOT NULL AND d.ra_requested_at IS NOT NULL
            THEN EXTRACT(DAY FROM d.payment_received_at - d.ra_requested_at)
            ELSE NULL END
        )::numeric, 0)::integer,
        0
      ),
      'policyAvgPayPercent', (
        SELECT mp.average_pay_percent
        FROM manufacturer_policies mp
        WHERE mp.labeler_id = d.labeler_id
        LIMIT 1
      ),
      'policyAvgDaysToPay', (
        SELECT mp.average_days_to_pay
        FROM manufacturer_policies mp
        WHERE mp.labeler_id = d.labeler_id
        LIMIT 1
      )
    ) AS row_data
    FROM debit_memos d
    WHERE (p_search IS NULL OR (
      LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR d.labeler_id LIKE '%' || p_search || '%'
    ))
    GROUP BY d.labeler_id
    ORDER BY SUM(d.amount_requested) - SUM(d.amount_received) DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

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
