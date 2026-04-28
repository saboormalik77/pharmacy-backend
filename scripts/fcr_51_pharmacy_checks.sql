-- ============================================================
-- FCR Module 14 — Pharmacy Checks Enhancement
-- Run this in Supabase SQL Editor
--
-- Contents:
--   1. Enhanced pharmacy_payments table (add check fields)
--   2. payment_manufacturer_credits table (manufacturer breakdown)
--   3. Updated _pharmacy_payment_to_json helper
--   4. Enhanced RPC functions for checks
--   5. Check PDF generation support
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Enhanced pharmacy_payments table
-- ────────────────────────────────────────────────────────────

-- Add new fields to existing pharmacy_payments table
ALTER TABLE pharmacy_payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('ocs', 'por', 'direct')) DEFAULT 'ocs',
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS return_reference_number TEXT,
ADD COLUMN IF NOT EXISTS pharmacy_account_number TEXT,
ADD COLUMN IF NOT EXISTS service_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS check_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gross_credit_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS included_credit_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS direct_credit_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS por_credit_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rsi_fee_included_percent DECIMAL(5,2) DEFAULT 14.90,
ADD COLUMN IF NOT EXISTS rsi_fee_direct_percent DECIMAL(5,2) DEFAULT 14.90,
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_pp_payment_type ON pharmacy_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_pp_check_number ON pharmacy_payments(check_number);
CREATE INDEX IF NOT EXISTS idx_pp_return_ref ON pharmacy_payments(return_reference_number);
CREATE INDEX IF NOT EXISTS idx_pp_service_date ON pharmacy_payments(service_date);
CREATE INDEX IF NOT EXISTS idx_pp_check_date ON pharmacy_payments(check_date);

-- Add unique constraint on check_number (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_check_number_unique ON pharmacy_payments(check_number) WHERE check_number IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 2. payment_manufacturer_credits table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_manufacturer_credits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id              UUID NOT NULL REFERENCES pharmacy_payments(id) ON DELETE CASCADE,
  manufacturer_name       TEXT NOT NULL,
  credit_amount           DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_type             TEXT NOT NULL CHECK (credit_type IN ('included', 'direct', 'por')),
  is_controlled_substance BOOLEAN DEFAULT false,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for manufacturer credits
CREATE INDEX IF NOT EXISTS idx_pmc_payment_id ON payment_manufacturer_credits(payment_id);
CREATE INDEX IF NOT EXISTS idx_pmc_manufacturer ON payment_manufacturer_credits(manufacturer_name);
CREATE INDEX IF NOT EXISTS idx_pmc_credit_type ON payment_manufacturer_credits(credit_type);
CREATE INDEX IF NOT EXISTS idx_pmc_created_at ON payment_manufacturer_credits(created_at);

-- Updated-at trigger for manufacturer credits
CREATE OR REPLACE FUNCTION update_payment_manufacturer_credits_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_manufacturer_credits_updated_at ON payment_manufacturer_credits;
CREATE TRIGGER trg_payment_manufacturer_credits_updated_at
  BEFORE UPDATE ON payment_manufacturer_credits
  FOR EACH ROW EXECUTE FUNCTION update_payment_manufacturer_credits_updated_at();

-- RLS for manufacturer credits
ALTER TABLE payment_manufacturer_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON payment_manufacturer_credits;
CREATE POLICY "Allow all access via service role" ON payment_manufacturer_credits
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 3. Updated _pharmacy_payment_to_json helper
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _pharmacy_payment_to_json(p pharmacy_payments)
RETURNS jsonb LANGUAGE sql STABLE AS $$
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
    -- New check-specific fields
    'paymentType',            p.payment_type,
    'checkNumber',            p.check_number,
    'returnReferenceNumber',  p.return_reference_number,
    'pharmacyAccountNumber',  p.pharmacy_account_number,
    'serviceDate',            p.service_date,
    'checkDate',              p.check_date,
    'grossCreditAmount',      p.gross_credit_amount,
    'includedCreditAmount',   p.included_credit_amount,
    'directCreditAmount',     p.direct_credit_amount,
    'porCreditAmount',        p.por_credit_amount,
    'rsiFeeIncludedPercent',  p.rsi_fee_included_percent,
    'rsiFeeDirectPercent',    p.rsi_fee_direct_percent,
    'isLegacy',               p.is_legacy
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 4. Helper function for manufacturer credits
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _get_manufacturer_credits(p_payment_id UUID)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'included', COALESCE(jsonb_agg(
      jsonb_build_object(
        'manufacturerName', pmc.manufacturer_name,
        'creditAmount', pmc.credit_amount,
        'isControlledSubstance', pmc.is_controlled_substance,
        'notes', pmc.notes
      ) ORDER BY pmc.manufacturer_name
    ) FILTER (WHERE pmc.credit_type = 'included'), '[]'::jsonb),
    'direct', COALESCE(jsonb_agg(
      jsonb_build_object(
        'manufacturerName', pmc.manufacturer_name,
        'creditAmount', pmc.credit_amount,
        'isControlledSubstance', pmc.is_controlled_substance,
        'notes', pmc.notes
      ) ORDER BY pmc.manufacturer_name
    ) FILTER (WHERE pmc.credit_type = 'direct'), '[]'::jsonb),
    'por', COALESCE(jsonb_agg(
      jsonb_build_object(
        'manufacturerName', pmc.manufacturer_name,
        'creditAmount', pmc.credit_amount,
        'isControlledSubstance', pmc.is_controlled_substance,
        'notes', pmc.notes
      ) ORDER BY pmc.manufacturer_name
    ) FILTER (WHERE pmc.credit_type = 'por'), '[]'::jsonb)
  )
  FROM payment_manufacturer_credits pmc
  WHERE pmc.payment_id = p_payment_id;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Enhanced RPC: pharmacy_payment_my_payments (with date range and checks data)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_my_payments(
  p_pharmacy_id UUID,
  p_status      TEXT DEFAULT NULL,
  p_date_range  TEXT DEFAULT NULL,
  p_start_date  DATE DEFAULT NULL,
  p_end_date    DATE DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
  v_summary  jsonb;
  v_where_date TEXT := '';
  v_date_filter_start DATE;
  v_date_filter_end DATE;
BEGIN
  -- Validate pharmacy exists
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Handle date range filtering
  IF p_date_range IS NOT NULL THEN
    CASE p_date_range
      WHEN 'this_month' THEN
        v_date_filter_start := date_trunc('month', CURRENT_DATE)::date;
        v_date_filter_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date;
      WHEN 'last_month' THEN
        v_date_filter_start := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
        v_date_filter_end := (date_trunc('month', CURRENT_DATE) - interval '1 day')::date;
      WHEN 'this_quarter' THEN
        v_date_filter_start := date_trunc('quarter', CURRENT_DATE)::date;
        v_date_filter_end := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' - interval '1 day')::date;
      WHEN 'last_quarter' THEN
        v_date_filter_start := (date_trunc('quarter', CURRENT_DATE) - interval '3 months')::date;
        v_date_filter_end := (date_trunc('quarter', CURRENT_DATE) - interval '1 day')::date;
      WHEN 'this_year' THEN
        v_date_filter_start := date_trunc('year', CURRENT_DATE)::date;
        v_date_filter_end := (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::date;
      WHEN 'last_12_months' THEN
        v_date_filter_start := (CURRENT_DATE - interval '12 months')::date;
        v_date_filter_end := CURRENT_DATE;
      WHEN 'custom' THEN
        v_date_filter_start := p_start_date;
        v_date_filter_end := p_end_date;
    END CASE;
  END IF;

  -- Build date filter clause
  IF v_date_filter_start IS NOT NULL AND v_date_filter_end IS NOT NULL THEN
    v_where_date := ' AND COALESCE(pp.check_date, pp.created_at)::date BETWEEN ''' || v_date_filter_start || ''' AND ''' || v_date_filter_end || '''';
  END IF;

  -- Count with date filter
  EXECUTE 'SELECT COUNT(*) FROM pharmacy_payments pp WHERE pp.pharmacy_id = $1 ' ||
          CASE WHEN p_status IS NOT NULL THEN 'AND pp.status = $2 ' ELSE '' END ||
          v_where_date
  INTO v_total
  USING p_pharmacy_id, p_status;

  -- Summary totals for this pharmacy with date filter
  EXECUTE 'SELECT jsonb_build_object(
    ''totalCredits'',        COALESCE(SUM(pp.total_credit_received), 0),
    ''totalFees'',           COALESCE(SUM(pp.company_fee + pp.gpo_share), 0),
    ''totalPayout'',         COALESCE(SUM(pp.pharmacy_payout), 0),
    ''paidPayouts'',         COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status = ''paid''), 0),
    ''pendingPayouts'',      COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status IN (''pending'', ''processing'')), 0),
    ''totalPayments'',       COUNT(*),
    ''paidCount'',           COUNT(*) FILTER (WHERE pp.status = ''paid''),
    ''pendingCount'',        COUNT(*) FILTER (WHERE pp.status IN (''pending'', ''processing''))
  ) FROM pharmacy_payments pp WHERE pp.pharmacy_id = $1 ' ||
          CASE WHEN p_status IS NOT NULL THEN 'AND pp.status = $2 ' ELSE '' END ||
          v_where_date
  INTO v_summary
  USING p_pharmacy_id, p_status;

  -- Data with manufacturer credits
  EXECUTE 'SELECT COALESCE(jsonb_agg(
    _pharmacy_payment_to_json(pp) || jsonb_build_object(''manufacturerCredits'', _get_manufacturer_credits(pp.id))
    ORDER BY pp.created_at DESC
  ), ''[]''::jsonb)
  FROM (
    SELECT pp.*
    FROM pharmacy_payments pp
    WHERE pp.pharmacy_id = $1 ' ||
      CASE WHEN p_status IS NOT NULL THEN 'AND pp.status = $2 ' ELSE '' END ||
      v_where_date || '
    ORDER BY pp.created_at DESC
    LIMIT $3 OFFSET $4
  ) pp'
  INTO v_rows
  USING p_pharmacy_id, p_status, p_limit, v_offset;

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


-- ────────────────────────────────────────────────────────────
-- 6. New RPC: pharmacy_payment_check_pdf_data
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_check_pdf_data(
  p_check_number TEXT
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_payment pharmacy_payments;
  v_pharmacy_data jsonb;
  v_manufacturer_credits jsonb;
BEGIN
  -- Get payment by check number
  SELECT * INTO v_payment 
  FROM pharmacy_payments 
  WHERE check_number = p_check_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Check not found');
  END IF;

  -- Get pharmacy details
  SELECT jsonb_build_object(
    'pharmacyName', p.pharmacy_name,
    'address', p.address,
    'city', p.city,
    'state', p.state,
    'zipCode', p.zip_code,
    'storeNumber', p.store_number
  ) INTO v_pharmacy_data
  FROM pharmacy p
  WHERE p.id = v_payment.pharmacy_id;

  -- Get manufacturer credits
  SELECT _get_manufacturer_credits(v_payment.id) INTO v_manufacturer_credits;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'payment', _pharmacy_payment_to_json(v_payment),
      'pharmacy', v_pharmacy_data,
      'manufacturerCredits', v_manufacturer_credits,
      'rsiAddress', jsonb_build_object(
        'street', '10635 Dutchtown Road',
        'city', 'Carteret',
        'state', 'NJ',
        'zipCode', '07008'
      )
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. RPC: pharmacy_payment_generate_check_number
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pharmacy_payment_generate_check_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_check_number TEXT;
  v_base_number INTEGER;
  v_attempts INTEGER := 0;
BEGIN
  LOOP
    -- Generate a 6-digit number starting from 200000
    v_base_number := 200000 + floor(random() * 800000)::integer;
    v_check_number := v_base_number::text;
    
    -- Check if this number already exists
    IF NOT EXISTS (SELECT 1 FROM pharmacy_payments WHERE check_number = v_check_number) THEN
      RETURN v_check_number;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique check number after 100 attempts';
    END IF;
  END LOOP;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. Data Migration: Update existing payments with basic check data
-- ────────────────────────────────────────────────────────────

-- Update existing payments with generated check numbers and basic classification
UPDATE pharmacy_payments 
SET 
  check_number = pharmacy_payment_generate_check_number(),
  payment_type = 'ocs',  -- Default to OCS for existing payments
  check_date = COALESCE(paid_at, created_at),
  service_date = created_at,
  gross_credit_amount = total_credit_received,
  included_credit_amount = total_credit_received,
  direct_credit_amount = 0,
  por_credit_amount = 0,
  is_legacy = true  -- Mark as legacy since we don't have detailed manufacturer data
WHERE check_number IS NULL;

-- Update pharmacy account numbers from existing pharmacy data
UPDATE pharmacy_payments pp
SET pharmacy_account_number = COALESCE(p.store_number, p.id::text)
FROM pharmacy p
WHERE pp.pharmacy_id = p.id 
AND pp.pharmacy_account_number IS NULL;

-- Update return reference numbers from batch data (if available)
UPDATE pharmacy_payments pp
SET return_reference_number = COALESCE(rb.batch_name, rb.id::text)
FROM return_batches rb
WHERE pp.batch_id = rb.id 
AND pp.return_reference_number IS NULL;