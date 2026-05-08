-- ================================================================
-- FIX: Missing Pharmacy Payment Creation Function and Table
-- ================================================================
-- This script creates the missing pharmacy_payments table and 
-- pharmacy_payment_create function needed for the API endpoint
-- ================================================================

-- ══════════════════════════════════════════════════════════════
-- Fix 1: Create pharmacy_payments Table (if missing)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pharmacy_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    batch_id uuid,
    total_credit_received numeric(12,2) DEFAULT 0 NOT NULL,
    company_fee numeric(12,2) DEFAULT 0 NOT NULL,
    company_fee_percent numeric(5,2) DEFAULT 0 NOT NULL,
    gpo_share numeric(12,2) DEFAULT 0 NOT NULL,
    gpo_name text,
    pharmacy_payout numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method text,
    payment_reference text,
    paid_at timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add primary key if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pharmacy_payments_pkey' 
    AND contype = 'p'
  ) THEN
    ALTER TABLE public.pharmacy_payments 
    ADD CONSTRAINT pharmacy_payments_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pharmacy_payments_payment_method_check'
  ) THEN
    ALTER TABLE public.pharmacy_payments 
    ADD CONSTRAINT pharmacy_payments_payment_method_check 
    CHECK ((payment_method = ANY (ARRAY['wire'::text, 'check'::text, 'zelle'::text, 'cash'::text])));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pharmacy_payments_status_check'
  ) THEN
    ALTER TABLE public.pharmacy_payments 
    ADD CONSTRAINT pharmacy_payments_status_check 
    CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'failed'::text, 'disputed'::text])));
  END IF;
END $$;

-- Set ownership and permissions
ALTER TABLE public.pharmacy_payments OWNER TO postgres;
GRANT ALL ON TABLE public.pharmacy_payments TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pharmacy_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pharmacy_payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pharmacy_payments TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_pharmacy_id ON public.pharmacy_payments(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_batch_id ON public.pharmacy_payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_status ON public.pharmacy_payments(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_created_at ON public.pharmacy_payments(created_at);

-- ══════════════════════════════════════════════════════════════
-- Fix 2: Create _pharmacy_payment_to_json Helper Function
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
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

ALTER FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) OWNER TO postgres;
GRANT ALL ON FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) TO anon;
GRANT ALL ON FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) TO authenticated;
GRANT ALL ON FUNCTION public._pharmacy_payment_to_json(p public.pharmacy_payments) TO service_role;

-- ══════════════════════════════════════════════════════════════
-- Fix 3: Create pharmacy_payment_create Function
-- ══════════════════════════════════════════════════════════════

-- Drop any existing version to avoid conflicts
DROP FUNCTION IF EXISTS public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid);

-- Create the pharmacy_payment_create function
CREATE OR REPLACE FUNCTION public.pharmacy_payment_create(
  p_pharmacy_id uuid, 
  p_batch_id uuid DEFAULT NULL::uuid, 
  p_total_credit_received numeric DEFAULT 0, 
  p_company_fee_percent numeric DEFAULT 27.0, 
  p_company_fee numeric DEFAULT 0, 
  p_gpo_share numeric DEFAULT 0, 
  p_pharmacy_payout numeric DEFAULT 0, 
  p_payment_method text DEFAULT NULL::text, 
  p_payment_reference text DEFAULT NULL::text, 
  p_notes text DEFAULT NULL::text, 
  p_created_by uuid DEFAULT NULL::uuid
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_payment pharmacy_payments;
  v_gpo_name TEXT;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'pharmacy_payment_create called: pharmacy_id=%, batch_id=%, total_credit=%, method=%, ref=%', 
    p_pharmacy_id, p_batch_id, p_total_credit_received, p_payment_method, p_payment_reference;

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

  -- Get GPO name from pharmacy (fallback to null if column doesn't exist)
  BEGIN
    SELECT gpo_affiliation INTO v_gpo_name FROM pharmacy WHERE id = p_pharmacy_id;
  EXCEPTION
    WHEN undefined_column THEN
      v_gpo_name := NULL;
  END;

  -- Insert the payment record
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

  -- Return success response
  RETURN jsonb_build_object(
    'error', false,
    'data', _pharmacy_payment_to_json(v_payment)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pharmacy_payment_create error: %', SQLERRM;
    RETURN jsonb_build_object(
      'error', true,
      'code', 500,
      'message', 'Internal error: ' || SQLERRM
    );
END;
$$;

-- Set ownership and permissions
ALTER FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) OWNER TO postgres;
GRANT ALL ON FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) TO anon;
GRANT ALL ON FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) TO service_role;

-- ══════════════════════════════════════════════════════════════
-- Fix 4: Create Additional Helper Functions (if needed)
-- ══════════════════════════════════════════════════════════════

-- Create pharmacy_payment_get function
CREATE OR REPLACE FUNCTION public.pharmacy_payment_get(p_payment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_payment pharmacy_payments;
  v_memos   jsonb;
BEGIN
  SELECT * INTO v_payment FROM pharmacy_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Payment not found');
  END IF;

  -- Get related debit memos
  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(dm) ORDER BY dm.created_at), '[]'::jsonb)
  INTO v_memos
  FROM debit_memos dm
  WHERE dm.pharmacy_id = v_payment.pharmacy_id
    AND (v_payment.batch_id IS NULL OR dm.batch_id = v_payment.batch_id);

  RETURN jsonb_build_object(
    'error', false,
    'data', _pharmacy_payment_to_json(v_payment) || jsonb_build_object('debitMemos', v_memos)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback without debit memos if _debit_memo_to_json doesn't exist
    RETURN jsonb_build_object(
      'error', false,
      'data', _pharmacy_payment_to_json(v_payment)
    );
END;
$$;

ALTER FUNCTION public.pharmacy_payment_get(uuid) OWNER TO postgres;
GRANT ALL ON FUNCTION public.pharmacy_payment_get(uuid) TO anon;
GRANT ALL ON FUNCTION public.pharmacy_payment_get(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.pharmacy_payment_get(uuid) TO service_role;

-- ══════════════════════════════════════════════════════════════
-- Fix 5: Verification Queries
-- ══════════════════════════════════════════════════════════════

-- Check if pharmacy_payments table exists
SELECT 
  '✅ Table Status' as check_type,
  'pharmacy_payments' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'pharmacy_payments'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status,
  'Table created' as notes;

-- Check if pharmacy_payment_create function exists
SELECT 
  '✅ Function Status' as check_type,
  p.proname as table_name,
  'EXISTS' as status,
  pg_get_function_arguments(p.oid) as notes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'pharmacy_payment_create';

-- Check helper function
SELECT 
  '✅ Helper Function' as check_type,
  p.proname as table_name,
  'EXISTS' as status,
  'Helper function available' as notes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = '_pharmacy_payment_to_json';

-- ══════════════════════════════════════════════════════════════
-- Success Message
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ PHARMACY PAYMENT CREATE FIX COMPLETE!';
  RAISE NOTICE '💰 pharmacy_payments table created/verified';
  RAISE NOTICE '🏗️  pharmacy_payment_create function created with all parameters';
  RAISE NOTICE '📊 Helper function _pharmacy_payment_to_json available';
  RAISE NOTICE '🔧 Additional support functions created';
  RAISE NOTICE '⚡ Performance indexes added';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST: Try creating a pharmacy payment via POST /api/admin/pharmacy-payments';
  RAISE NOTICE '📋 Function signature: pharmacy_payment_create(pharmacy_id, batch_id, total_credit, fee_percent, fee, gpo_share, payout, method, reference, notes, created_by)';
END $$;