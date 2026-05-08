-- ============================================================
-- Fix: Pharmacy payment "Check Number" not appearing in API
-- responses (UI shows "—" even after Issue Check succeeds).
--
-- Root cause:
--   The deployed _pharmacy_payment_to_json(pharmacy_payments)
--   helper does NOT include checkNumber / checkDate / paymentType /
--   returnReferenceNumber / etc. in its JSON output. Every read
--   path (pharmacy_payment_list, pharmacy_payment_get,
--   pharmacy_payment_update return value) goes through this
--   helper, so the frontend never receives the column even though
--   it is correctly persisted on the row.
--
--   This regression was introduced when one of the legacy fix
--   scripts (FIX_PHARMACY_PAYMENT_CREATE.sql /
--   FIX_PHARMACY_PAYMENT_FUNCTION.sql) was re-run; both ship the
--   old narrow version of the helper.
--
-- Fix:
--   1. Ensure all the "check" columns exist on pharmacy_payments
--      (idempotent — no-op if the original migration already ran).
--   2. Recreate _pharmacy_payment_to_json with the full set of
--      fields the frontend types expect.
--   3. Recreate pharmacy_payment_update with the 4 extra
--      parameters (p_check_number, p_check_date, p_payment_type,
--      p_return_reference_number) so the IssueCheck PATCH can
--      both write AND read the new fields back.
--
-- Safe to re-run.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Ensure check-related columns exist (idempotent).
-- ────────────────────────────────────────────────────────────

ALTER TABLE pharmacy_payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT
    CHECK (payment_type IN ('ocs', 'por', 'direct')) DEFAULT 'ocs',
  ADD COLUMN IF NOT EXISTS check_number TEXT,
  ADD COLUMN IF NOT EXISTS return_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS pharmacy_account_number TEXT,
  ADD COLUMN IF NOT EXISTS service_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gross_credit_amount   DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS included_credit_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_credit_amount   DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS por_credit_amount      DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsi_fee_included_percent DECIMAL(5,2) DEFAULT 14.90,
  ADD COLUMN IF NOT EXISTS rsi_fee_direct_percent   DECIMAL(5,2) DEFAULT 14.90,
  ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_check_number_unique
  ON pharmacy_payments(check_number) WHERE check_number IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 2. Recreate _pharmacy_payment_to_json with check fields.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'id',                     p.id,
    'pharmacyId',             p.pharmacy_id,
    'pharmacyName',           COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = p.pharmacy_id), ''),
    'batchId',                p.batch_id,
    'batchName',              COALESCE((SELECT batch_name FROM return_batches WHERE id = p.batch_id), ''),
    'batchMonth',             (SELECT batch_month FROM return_batches WHERE id = p.batch_id),
    'totalCreditReceived',    p.total_credit_received,
    'companyFee',             p.company_fee,
    'companyFeePercent',      p.company_fee_percent,
    'gpoShare',               p.gpo_share,
    'gpoName',                p.gpo_name,
    'pharmacyPayout',         p.pharmacy_payout,
    'paymentMethod',          p.payment_method,
    'paymentReference',       p.payment_reference,
    'paidAt',                 p.paid_at,
    'status',                 p.status,
    'notes',                  p.notes,
    'createdBy',              p.created_by,
    'createdAt',              p.created_at,
    'updatedAt',              p.updated_at,
    'paymentType',            p.payment_type,
    'checkNumber',            p.check_number,
    'checkDate',              p.check_date,
    'returnReferenceNumber',  p.return_reference_number,
    'pharmacyAccountNumber',  p.pharmacy_account_number,
    'serviceDate',            p.service_date,
    'grossCreditAmount',      p.gross_credit_amount,
    'includedCreditAmount',   p.included_credit_amount,
    'directCreditAmount',     p.direct_credit_amount,
    'porCreditAmount',        p.por_credit_amount,
    'rsiFeeIncludedPercent',  p.rsi_fee_included_percent,
    'rsiFeeDirectPercent',    p.rsi_fee_direct_percent,
    'isLegacy',               p.is_legacy
  );
$$;

ALTER FUNCTION public._pharmacy_payment_to_json(public.pharmacy_payments) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public._pharmacy_payment_to_json(public.pharmacy_payments)
  TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 3. Recreate pharmacy_payment_update with the 4 extra params
--    (so /admin/pharmacy-payments/:id PATCH actually persists
--     check_number, check_date, payment_type, return_reference_number).
--    We DROP the legacy 11-param signature first to avoid the
--    "function name is not unique" overload ambiguity.
-- ────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.pharmacy_payment_update(
  uuid, text, text, text, timestamp with time zone, text,
  numeric, numeric, numeric, numeric, numeric
);

CREATE OR REPLACE FUNCTION public.pharmacy_payment_update(
  p_payment_id              uuid,
  p_status                  text          DEFAULT NULL,
  p_payment_method          text          DEFAULT NULL,
  p_payment_reference       text          DEFAULT NULL,
  p_paid_at                 timestamptz   DEFAULT NULL,
  p_notes                   text          DEFAULT NULL,
  p_company_fee             numeric       DEFAULT NULL,
  p_company_fee_pct         numeric       DEFAULT NULL,
  p_gpo_share               numeric       DEFAULT NULL,
  p_pharmacy_payout         numeric       DEFAULT NULL,
  p_total_credit            numeric       DEFAULT NULL,
  p_check_number            text          DEFAULT NULL,
  p_check_date              timestamptz   DEFAULT NULL,
  p_payment_type            text          DEFAULT NULL,
  p_return_reference_number text          DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_payment pharmacy_payments;
BEGIN
  SELECT * INTO v_payment FROM pharmacy_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Payment record not found');
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'processing', 'paid', 'failed', 'disputed') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Invalid status. Must be: pending, processing, paid, failed, disputed');
  END IF;

  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('wire', 'check', 'zelle', 'cash') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Invalid payment_method. Must be: wire, check, zelle, cash');
  END IF;

  IF p_payment_type IS NOT NULL AND p_payment_type NOT IN ('ocs', 'por', 'direct') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Invalid paymentType. Must be: ocs, por, direct');
  END IF;

  UPDATE pharmacy_payments SET
    status                  = COALESCE(p_status, status),
    payment_method          = COALESCE(p_payment_method, payment_method),
    payment_reference       = COALESCE(p_payment_reference, payment_reference),
    paid_at                 = CASE
                                WHEN p_status = 'paid' AND paid_at IS NULL THEN COALESCE(p_paid_at, NOW())
                                WHEN p_paid_at IS NOT NULL THEN p_paid_at
                                ELSE paid_at
                              END,
    notes                   = COALESCE(p_notes, notes),
    company_fee             = COALESCE(p_company_fee, company_fee),
    company_fee_percent     = COALESCE(p_company_fee_pct, company_fee_percent),
    gpo_share               = COALESCE(p_gpo_share, gpo_share),
    pharmacy_payout         = COALESCE(p_pharmacy_payout, pharmacy_payout),
    total_credit_received   = COALESCE(p_total_credit, total_credit_received),
    check_number            = COALESCE(p_check_number, check_number),
    check_date              = COALESCE(p_check_date, check_date),
    payment_type            = COALESCE(p_payment_type, payment_type),
    return_reference_number = COALESCE(p_return_reference_number, return_reference_number),
    updated_at              = NOW()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object(
    'error', false,
    'data',  _pharmacy_payment_to_json(v_payment)
  );
END;
$$;

ALTER FUNCTION public.pharmacy_payment_update(
  uuid, text, text, text, timestamptz, text,
  numeric, numeric, numeric, numeric, numeric,
  text, timestamptz, text, text
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.pharmacy_payment_update(
  uuid, text, text, text, timestamptz, text,
  numeric, numeric, numeric, numeric, numeric,
  text, timestamptz, text, text
) TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 4. Sanity verification — should print 33 keys including
--    "checkNumber", "checkDate", "paymentType",
--    "returnReferenceNumber".
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_keys TEXT;
BEGIN
  SELECT string_agg(k, ', ' ORDER BY k)
  INTO   v_keys
  FROM (
    SELECT jsonb_object_keys(_pharmacy_payment_to_json(pp)) AS k
    FROM   pharmacy_payments pp
    LIMIT  1
  ) s;
  RAISE NOTICE 'pharmacy_payment JSON keys: %', v_keys;
END $$;
