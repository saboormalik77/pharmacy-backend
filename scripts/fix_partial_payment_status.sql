-- Migration: fix_partial_payment_status
-- Problem: payment_record sets status='partial' when amount_received > 0 but < amount_requested.
--          This causes those debit memos to remain visible in the unpaid list forever.
-- Fix:     Any amount_received > 0 should immediately set status='paid'.
--          Also update payment_list_unpaid to exclude amount_received > 0 rows as a safety net.

-- ============================================================
-- Step 1: Backfill — promote existing partial rows to paid
-- ============================================================
UPDATE debit_memos
SET payment_status = 'paid'
WHERE payment_status = 'partial'
  AND COALESCE(amount_received, 0) > 0;

-- ============================================================
-- Step 2: Replace payment_record (5-param, no credit_memo_url)
-- ============================================================
CREATE OR REPLACE FUNCTION public.payment_record(
  p_debit_memo_id   uuid,
  p_amount_received numeric,
  p_payment_date    timestamp with time zone DEFAULT now(),
  p_reference       text DEFAULT NULL::text,
  p_notes           text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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

  -- Any received amount marks the memo as paid; 0 resets to pending.
  IF p_amount_received > 0 THEN
    v_status := 'paid';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE debit_memos SET
    amount_received      = p_amount_received,
    payment_received_at  = p_payment_date,
    payment_reference    = COALESCE(NULLIF(TRIM(p_reference), ''), payment_reference),
    payment_notes        = COALESCE(NULLIF(TRIM(p_notes), ''), payment_notes),
    payment_status       = v_status,
    total_received_value = p_amount_received
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object('error', false, 'data', _debit_memo_to_json(v_memo));
END;
$$;

-- ============================================================
-- Step 3: Replace payment_record (6-param, with credit_memo_url)
-- ============================================================
CREATE OR REPLACE FUNCTION public.payment_record(
  p_debit_memo_id   uuid,
  p_amount_received numeric,
  p_payment_date    timestamp with time zone DEFAULT now(),
  p_reference       text DEFAULT NULL::text,
  p_notes           text DEFAULT NULL::text,
  p_credit_memo_url text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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

  -- Any received amount marks the memo as paid; 0 resets to pending.
  IF p_amount_received > 0 THEN
    v_status := 'paid';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE debit_memos SET
    amount_received      = p_amount_received,
    payment_received_at  = p_payment_date,
    payment_reference    = p_reference,
    payment_notes        = p_notes,
    payment_status       = v_status,
    total_received_value = p_amount_received,
    credit_memo_url      = COALESCE(p_credit_memo_url, credit_memo_url)
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object('error', false, 'data', _debit_memo_to_json(v_memo));
END;
$$;

-- ============================================================
-- Step 4: Update payment_list_unpaid — exclude any row that
--         already has amount_received > 0 (safety net for
--         stale partial rows that may still exist in the DB).
-- ============================================================
CREATE OR REPLACE FUNCTION public.payment_list_unpaid(
  p_manufacturer text DEFAULT NULL::text,
  p_destination  text DEFAULT NULL::text,
  p_search       text DEFAULT NULL::text,
  p_page         integer DEFAULT 1,
  p_limit        integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_offset            INTEGER;
  v_total             INTEGER;
  v_rows              jsonb;
  v_total_outstanding DECIMAL(12,2);
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*), COALESCE(SUM(d.amount_requested - d.amount_received), 0)
    INTO v_total, v_total_outstanding
  FROM debit_memos d
  WHERE d.payment_status IN ('pending', 'partial')
    AND COALESCE(d.amount_received, 0) = 0
    AND (p_manufacturer IS NULL
         OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
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
      AND COALESCE(d.amount_received, 0) = 0
      AND (p_manufacturer IS NULL
           OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
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
    'data',  v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', jsonb_build_object(
      'totalUnpaid',     v_total,
      'totalOutstanding', v_total_outstanding
    )
  );
END;
$$;
