-- ============================================================
-- FCR Module 13 — Pharmacy & GPO Payout
-- Run this in Supabase SQL Editor
--
-- Contents:
--   1. pharmacy_payments table
--   2. Helper: _pharmacy_payment_to_json
--   3. RPC: pharmacy_payment_calculate (calculate payout for a pharmacy+batch)
--   4. RPC: pharmacy_payment_create (create payment record)
--   5. RPC: pharmacy_payment_update (update payment record, mark paid, etc.)
--   6. RPC: pharmacy_payment_get (get single payment detail)
--   7. RPC: pharmacy_payment_list (admin: list all payments, filters)
--   8. RPC: pharmacy_payment_summary (admin: summary grouped by pharmacy)
--   9. RPC: pharmacy_payment_my_payments (pharmacy: own payment history)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. pharmacy_payments table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pharmacy_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id           UUID NOT NULL REFERENCES pharmacy(id) ON DELETE RESTRICT,
  batch_id              UUID REFERENCES return_batches(id) ON DELETE SET NULL,
  total_credit_received DECIMAL(12,2) NOT NULL DEFAULT 0,
  company_fee           DECIMAL(12,2) NOT NULL DEFAULT 0,
  company_fee_percent   DECIMAL(5,2) NOT NULL DEFAULT 0,
  gpo_share             DECIMAL(12,2) NOT NULL DEFAULT 0,
  gpo_name              TEXT,
  pharmacy_payout       DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method        TEXT CHECK (payment_method IN ('wire', 'check', 'zelle', 'cash')),
  payment_reference     TEXT,
  paid_at               TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'disputed')),
  notes                 TEXT,
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pp_pharmacy   ON pharmacy_payments(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pp_batch      ON pharmacy_payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_pp_status     ON pharmacy_payments(status);
CREATE INDEX IF NOT EXISTS idx_pp_paid_at    ON pharmacy_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_pp_created_at ON pharmacy_payments(created_at);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_pharmacy_payments_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pharmacy_payments_updated_at ON pharmacy_payments;
CREATE TRIGGER trg_pharmacy_payments_updated_at
  BEFORE UPDATE ON pharmacy_payments
  FOR EACH ROW EXECUTE FUNCTION update_pharmacy_payments_updated_at();

-- RLS
ALTER TABLE pharmacy_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON pharmacy_payments;
CREATE POLICY "Allow all access via service role" ON pharmacy_payments
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2. Helper: _pharmacy_payment_to_json
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _pharmacy_payment_to_json(p pharmacy_payments)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                   p.id,
    'pharmacyId',           p.pharmacy_id,
    'pharmacyName',         COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = p.pharmacy_id), ''),
    'batchId',              p.batch_id,
    'batchName',            COALESCE((SELECT batch_name FROM return_batches WHERE id = p.batch_id), ''),
    'batchMonth',           (SELECT batch_month FROM return_batches WHERE id = p.batch_id),
    'totalCreditReceived',  p.total_credit_received,
    'companyFee',           p.company_fee,
    'companyFeePercent',    p.company_fee_percent,
    'gpoShare',             p.gpo_share,
    'gpoName',              p.gpo_name,
    'pharmacyPayout',       p.pharmacy_payout,
    'paymentMethod',        p.payment_method,
    'paymentReference',     p.payment_reference,
    'paidAt',               p.paid_at,
    'status',               p.status,
    'notes',                p.notes,
    'createdBy',            p.created_by,
    'createdAt',            p.created_at,
    'updatedAt',            p.updated_at
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 3. RPC: pharmacy_payment_calculate
--    Calculates payout for a pharmacy + batch.
--    Sums all paid debit_memos for that pharmacy in that batch,
--    then applies company fee % and GPO share.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_calculate(
  p_pharmacy_id       UUID,
  p_batch_id          UUID,
  p_company_fee_pct   DECIMAL DEFAULT 27.0,
  p_gpo_share_pct     DECIMAL DEFAULT 0.0
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_total_credit   DECIMAL(12,2);
  v_company_fee    DECIMAL(12,2);
  v_gpo_share      DECIMAL(12,2);
  v_pharmacy_payout DECIMAL(12,2);
  v_gpo_name       TEXT;
  v_pharmacy_name  TEXT;
  v_batch_name     TEXT;
  v_memo_count     INTEGER;
BEGIN
  -- Validate pharmacy exists
  SELECT pharmacy_name INTO v_pharmacy_name FROM pharmacy WHERE id = p_pharmacy_id;
  IF v_pharmacy_name IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  -- Validate batch exists
  SELECT batch_name INTO v_batch_name FROM return_batches WHERE id = p_batch_id;
  IF v_batch_name IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  -- Get GPO affiliation from pharmacy
  SELECT gpo_affiliation INTO v_gpo_name FROM pharmacy WHERE id = p_pharmacy_id;

  -- Sum all received payments from debit memos for this pharmacy in this batch
  SELECT COALESCE(SUM(amount_received), 0), COUNT(*)
    INTO v_total_credit, v_memo_count
  FROM debit_memos
  WHERE pharmacy_id = p_pharmacy_id
    AND batch_id = p_batch_id
    AND payment_status IN ('paid', 'partial');

  -- Calculate splits
  v_company_fee    := ROUND(v_total_credit * (p_company_fee_pct / 100.0), 2);
  v_gpo_share      := ROUND(v_total_credit * (p_gpo_share_pct / 100.0), 2);
  v_pharmacy_payout := v_total_credit - v_company_fee - v_gpo_share;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId',          p_pharmacy_id,
      'pharmacyName',        v_pharmacy_name,
      'batchId',             p_batch_id,
      'batchName',           v_batch_name,
      'gpoName',             v_gpo_name,
      'totalCreditReceived', v_total_credit,
      'memoCount',           v_memo_count,
      'companyFeePercent',   p_company_fee_pct,
      'companyFee',          v_company_fee,
      'gpoSharePercent',     p_gpo_share_pct,
      'gpoShare',            v_gpo_share,
      'pharmacyPayout',      v_pharmacy_payout
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. RPC: pharmacy_payment_create
--    Creates a new pharmacy payment record.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_create(
  p_pharmacy_id          UUID,
  p_batch_id             UUID DEFAULT NULL,
  p_total_credit_received DECIMAL DEFAULT 0,
  p_company_fee_percent  DECIMAL DEFAULT 27.0,
  p_company_fee          DECIMAL DEFAULT 0,
  p_gpo_share            DECIMAL DEFAULT 0,
  p_pharmacy_payout      DECIMAL DEFAULT 0,
  p_payment_method       TEXT DEFAULT NULL,
  p_payment_reference    TEXT DEFAULT NULL,
  p_notes                TEXT DEFAULT NULL,
  p_created_by           UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment pharmacy_payments;
  v_gpo_name TEXT;
BEGIN
  -- Validate pharmacy exists
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  -- Validate batch exists (if provided)
  IF p_batch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM return_batches WHERE id = p_batch_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  -- Validate payment_method if provided
  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('wire', 'check', 'zelle', 'cash') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid payment_method. Must be: wire, check, zelle, cash');
  END IF;

  -- Check for duplicate pharmacy+batch payment
  IF p_batch_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pharmacy_payments
    WHERE pharmacy_id = p_pharmacy_id AND batch_id = p_batch_id
      AND status NOT IN ('failed')
  ) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A payment record already exists for this pharmacy and batch');
  END IF;

  -- Get GPO name from pharmacy
  SELECT gpo_affiliation INTO v_gpo_name FROM pharmacy WHERE id = p_pharmacy_id;

  INSERT INTO pharmacy_payments (
    pharmacy_id, batch_id, total_credit_received, company_fee,
    company_fee_percent, gpo_share, gpo_name, pharmacy_payout,
    payment_method, payment_reference, notes, created_by, status
  ) VALUES (
    p_pharmacy_id, p_batch_id, p_total_credit_received, p_company_fee,
    p_company_fee_percent, p_gpo_share, v_gpo_name, p_pharmacy_payout,
    p_payment_method, p_payment_reference, p_notes, p_created_by, 'pending'
  )
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object(
    'error', false,
    'data', _pharmacy_payment_to_json(v_payment)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. RPC: pharmacy_payment_update
--    Update a pharmacy payment (status, method, reference, etc.)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_update(
  p_payment_id        UUID,
  p_status            TEXT DEFAULT NULL,
  p_payment_method    TEXT DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_paid_at           TIMESTAMPTZ DEFAULT NULL,
  p_notes             TEXT DEFAULT NULL,
  p_company_fee       DECIMAL DEFAULT NULL,
  p_company_fee_pct   DECIMAL DEFAULT NULL,
  p_gpo_share         DECIMAL DEFAULT NULL,
  p_pharmacy_payout   DECIMAL DEFAULT NULL,
  p_total_credit      DECIMAL DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment pharmacy_payments;
BEGIN
  SELECT * INTO v_payment FROM pharmacy_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Payment record not found');
  END IF;

  -- Validate status if provided
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'processing', 'paid', 'failed', 'disputed') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid status. Must be: pending, processing, paid, failed, disputed');
  END IF;

  -- Validate payment_method if provided
  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('wire', 'check', 'zelle', 'cash') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid payment_method. Must be: wire, check, zelle, cash');
  END IF;

  UPDATE pharmacy_payments SET
    status              = COALESCE(p_status, status),
    payment_method      = COALESCE(p_payment_method, payment_method),
    payment_reference   = COALESCE(p_payment_reference, payment_reference),
    paid_at             = CASE
                            WHEN p_status = 'paid' AND paid_at IS NULL THEN COALESCE(p_paid_at, NOW())
                            WHEN p_paid_at IS NOT NULL THEN p_paid_at
                            ELSE paid_at
                          END,
    notes               = COALESCE(p_notes, notes),
    company_fee         = COALESCE(p_company_fee, company_fee),
    company_fee_percent = COALESCE(p_company_fee_pct, company_fee_percent),
    gpo_share           = COALESCE(p_gpo_share, gpo_share),
    pharmacy_payout     = COALESCE(p_pharmacy_payout, pharmacy_payout),
    total_credit_received = COALESCE(p_total_credit, total_credit_received)
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object(
    'error', false,
    'data', _pharmacy_payment_to_json(v_payment)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RPC: pharmacy_payment_get
--    Get a single payment by ID (with debit memo details).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_get(
  p_payment_id UUID
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_payment pharmacy_payments;
  v_memos   jsonb;
BEGIN
  SELECT * INTO v_payment FROM pharmacy_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Payment record not found');
  END IF;

  -- Get associated debit memos for this pharmacy + batch
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               dm.id,
      'memoNumber',       dm.memo_number,
      'labelerName',      dm.labeler_name,
      'destination',      dm.destination,
      'totalItems',       dm.total_items,
      'amountRequested',  dm.amount_requested,
      'amountReceived',   dm.amount_received,
      'paymentStatus',    dm.payment_status
    ) ORDER BY dm.memo_number
  ), '[]'::jsonb)
  INTO v_memos
  FROM debit_memos dm
  WHERE dm.pharmacy_id = v_payment.pharmacy_id
    AND (v_payment.batch_id IS NULL OR dm.batch_id = v_payment.batch_id);

  RETURN jsonb_build_object(
    'error', false,
    'data', _pharmacy_payment_to_json(v_payment) || jsonb_build_object('debitMemos', v_memos)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. RPC: pharmacy_payment_list
--    Admin: list all pharmacy payments with filters.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_list(
  p_status   TEXT DEFAULT NULL,
  p_pharmacy TEXT DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_search   TEXT DEFAULT NULL,
  p_page     INTEGER DEFAULT 1,
  p_limit    INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
  v_totals jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count
  SELECT COUNT(*)
    INTO v_total
  FROM pharmacy_payments pp
  JOIN pharmacy ph ON ph.id = pp.pharmacy_id
  WHERE (p_status IS NULL OR pp.status = p_status)
    AND (p_batch_id IS NULL OR pp.batch_id = p_batch_id)
    AND (p_pharmacy IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_pharmacy) || '%'
      OR ph.store_number = p_pharmacy
    ))
    AND (p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.payment_reference, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.gpo_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    ));

  -- Aggregate totals
  SELECT jsonb_build_object(
    'totalPayments',        COUNT(*),
    'totalCreditReceived',  COALESCE(SUM(pp.total_credit_received), 0),
    'totalCompanyFee',      COALESCE(SUM(pp.company_fee), 0),
    'totalGpoShare',        COALESCE(SUM(pp.gpo_share), 0),
    'totalPharmacyPayout',  COALESCE(SUM(pp.pharmacy_payout), 0),
    'paidCount',            COUNT(*) FILTER (WHERE pp.status = 'paid'),
    'pendingCount',         COUNT(*) FILTER (WHERE pp.status = 'pending'),
    'processingCount',      COUNT(*) FILTER (WHERE pp.status = 'processing')
  )
  INTO v_totals
  FROM pharmacy_payments pp
  JOIN pharmacy ph ON ph.id = pp.pharmacy_id
  WHERE (p_status IS NULL OR pp.status = p_status)
    AND (p_batch_id IS NULL OR pp.batch_id = p_batch_id)
    AND (p_pharmacy IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_pharmacy) || '%'
      OR ph.store_number = p_pharmacy
    ))
    AND (p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.payment_reference, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.gpo_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    ));

  -- Data rows
  SELECT COALESCE(jsonb_agg(
    _pharmacy_payment_to_json(pp)
    ORDER BY pp.created_at DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT pp.*
    FROM pharmacy_payments pp
    JOIN pharmacy ph ON ph.id = pp.pharmacy_id
    WHERE (p_status IS NULL OR pp.status = p_status)
      AND (p_batch_id IS NULL OR pp.batch_id = p_batch_id)
      AND (p_pharmacy IS NULL OR (
        LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_pharmacy) || '%'
        OR ph.store_number = p_pharmacy
      ))
      AND (p_search IS NULL OR (
        LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(pp.payment_reference, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(pp.gpo_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR ph.store_number = p_search
      ))
    ORDER BY pp.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) pp;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', v_totals
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. RPC: pharmacy_payment_summary
--    Admin: summary of payouts grouped by pharmacy.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_summary(
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

  -- Count distinct pharmacies
  SELECT COUNT(DISTINCT pp.pharmacy_id)
    INTO v_total
  FROM pharmacy_payments pp
  JOIN pharmacy ph ON ph.id = pp.pharmacy_id
  WHERE p_search IS NULL OR (
    LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
    OR LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
    OR ph.store_number = p_search
  );

  -- Grouped data
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_payout DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'pharmacyId',           pp.pharmacy_id,
      'pharmacyName',         MAX(ph.pharmacy_name),
      'storeNumber',          MAX(ph.store_number),
      'gpoAffiliation',      MAX(ph.gpo_affiliation),
      'totalPayments',        COUNT(*),
      'totalCreditReceived',  SUM(pp.total_credit_received),
      'totalCompanyFee',      SUM(pp.company_fee),
      'totalGpoShare',        SUM(pp.gpo_share),
      'totalPayout',          SUM(pp.pharmacy_payout),
      'paidCount',            COUNT(*) FILTER (WHERE pp.status = 'paid'),
      'pendingCount',         COUNT(*) FILTER (WHERE pp.status IN ('pending', 'processing')),
      'lastPaidAt',           MAX(pp.paid_at)
    ) AS row_data,
    SUM(pp.pharmacy_payout) AS total_payout
    FROM pharmacy_payments pp
    JOIN pharmacy ph ON ph.id = pp.pharmacy_id
    WHERE p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    )
    GROUP BY pp.pharmacy_id
    ORDER BY total_payout DESC
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


-- ────────────────────────────────────────────────────────────
-- 9. RPC: pharmacy_payment_my_payments
--    Pharmacy-facing: returns own payment history.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_my_payments(
  p_pharmacy_id UUID,
  p_status      TEXT DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
  v_summary  jsonb;
BEGIN
  -- Validate pharmacy exists
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count
  SELECT COUNT(*)
    INTO v_total
  FROM pharmacy_payments pp
  WHERE pp.pharmacy_id = p_pharmacy_id
    AND (p_status IS NULL OR pp.status = p_status);

  -- Summary totals for this pharmacy
  SELECT jsonb_build_object(
    'totalCredits',        COALESCE(SUM(pp.total_credit_received), 0),
    'totalFees',           COALESCE(SUM(pp.company_fee + pp.gpo_share), 0),
    'totalPayout',         COALESCE(SUM(pp.pharmacy_payout), 0),
    'paidPayouts',         COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status = 'paid'), 0),
    'pendingPayouts',      COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status IN ('pending', 'processing')), 0),
    'totalPayments',       COUNT(*),
    'paidCount',           COUNT(*) FILTER (WHERE pp.status = 'paid'),
    'pendingCount',        COUNT(*) FILTER (WHERE pp.status IN ('pending', 'processing'))
  )
  INTO v_summary
  FROM pharmacy_payments pp
  WHERE pp.pharmacy_id = p_pharmacy_id;

  -- Data
  SELECT COALESCE(jsonb_agg(
    _pharmacy_payment_to_json(pp)
    ORDER BY pp.created_at DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT pp.*
    FROM pharmacy_payments pp
    WHERE pp.pharmacy_id = p_pharmacy_id
      AND (p_status IS NULL OR pp.status = p_status)
    ORDER BY pp.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) pp;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', v_summary
  );
END;
$$;
