-- ============================================================
-- Fix: "Asked" column shows $0.00 on /warehouse/unpaid even
--      though the correct amount appears in "Outstanding".
--
-- Root cause:
--   debit_memos has TWO amount columns:
--     • total_ask_value   — auto-computed from return items
--                           when the memo is created (the real
--                           "asked" amount, e.g. $56).
--     • amount_requested  — a payment-tracking field that an
--                           admin sets manually; defaults to 0.
--
--   _debit_memo_to_json maps  'amountRequested' → d.amount_requested
--   so new memos (amount_requested still 0) always show $0 in
--   the "Asked" column, while outstandingAmount (derived from
--   total_ask_value or a payment-tracking calculation) correctly
--   shows the real value.
--
-- Fix:
--   1. In _debit_memo_to_json, emit amountRequested as
--      CASE WHEN d.amount_requested > 0
--           THEN d.amount_requested
--           ELSE d.total_ask_value
--      END
--      so that memos which have never had a manual amount set
--      still display the correct item-computed value.
--
--   2. In payment_list_unpaid, use the same effective expression
--      for outstandingAmount so both columns stay consistent.
--
-- Safe to re-run (both are CREATE OR REPLACE).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Fix _debit_memo_to_json
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._debit_memo_to_json(d public.debit_memos)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN jsonb_build_object(
    'id',                  $1.id,
    'batchId',             $1.batch_id,
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
    'amountRequested',     COALESCE(NULLIF($1.amount_requested, 0::numeric), $1.total_ask_value),
    'amountReceived',      $1.amount_received,
    'paymentReceivedAt',   $1.payment_received_at,
    'paymentReference',    $1.payment_reference,
    'paymentNotes',        $1.payment_notes,
    'createdAt',           $1.created_at,
    'updatedAt',           $1.updated_at
  );
END;
$$;

ALTER FUNCTION public._debit_memo_to_json(public.debit_memos) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public._debit_memo_to_json(public.debit_memos)
  TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 2. Fix payment_list_unpaid — use the same effective ask
--    amount for outstandingAmount and summary totals, and
--    keep the DESC ordering from the previous fix.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.payment_list_unpaid(
  p_manufacturer TEXT DEFAULT NULL,
  p_destination  TEXT DEFAULT NULL,
  p_search       TEXT DEFAULT NULL,
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_offset             INTEGER;
  v_total              INTEGER;
  v_rows               jsonb;
  v_total_outstanding  DECIMAL(12,2);
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT
    COUNT(*),
    COALESCE(SUM(
      CASE WHEN d.amount_requested > 0 THEN d.amount_requested ELSE d.total_ask_value END
      - d.amount_received
    ), 0)
  INTO v_total, v_total_outstanding
  FROM debit_memos d
  WHERE d.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL
         OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
         OR d.labeler_id = p_manufacturer)
    AND (p_destination IS NULL OR d.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), ''))
         LIKE '%' || LOWER(p_search) || '%'
    ));

  SELECT COALESCE(jsonb_agg(
    _debit_memo_to_json(d) || jsonb_build_object(
      'daysOutstanding',
        EXTRACT(DAY FROM NOW() - COALESCE(d.ra_requested_at, d.created_at))::integer,
      'outstandingAmount',
        CASE WHEN d.amount_requested > 0 THEN d.amount_requested ELSE d.total_ask_value END
        - d.amount_received
    )
    ORDER BY COALESCE(d.ra_requested_at, d.created_at) DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT d.*
    FROM debit_memos d
    WHERE d.payment_status IN ('pending', 'partial')
      AND (p_manufacturer IS NULL
           OR LOWER(d.labeler_name) LIKE '%' || LOWER(p_manufacturer) || '%'
           OR d.labeler_id = p_manufacturer)
      AND (p_destination IS NULL OR d.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(d.memo_number) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), ''))
           LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY COALESCE(d.ra_requested_at, d.created_at) DESC
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

GRANT EXECUTE ON FUNCTION public.payment_list_unpaid(text, text, text, integer, integer)
  TO anon, authenticated, service_role;
