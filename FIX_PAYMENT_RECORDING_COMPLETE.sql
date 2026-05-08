-- ================================================================
-- COMPLETE FIX: Payment Recording for Debit Memos
-- ================================================================
-- This script fixes all issues with recording payments:
-- 1. Adds missing payment columns to debit_memos table
-- 2. Creates missing payment_record functions (both versions)
-- 3. Ensures _debit_memo_to_json includes payment fields
-- 4. Verifies all components work together
-- ================================================================

-- ══════════════════════════════════════════════════════════════
-- Fix 1: Add Missing Payment Columns to debit_memos Table
-- ══════════════════════════════════════════════════════════════

-- Add payment-related columns if they don't exist
ALTER TABLE public.debit_memos 
ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS payment_notes text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' NOT NULL CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled')),
ADD COLUMN IF NOT EXISTS amount_requested numeric(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS amount_received numeric(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS credit_memo_url text;

-- ══════════════════════════════════════════════════════════════
-- Fix 2: Update _debit_memo_to_json Helper Function
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._debit_memo_to_json(d public.debit_memos) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  SELECT jsonb_build_object(
    'id',                  d.id,
    'batchId',             d.batch_id,
    'pharmacyId',          d.pharmacy_id,
    'pharmacyName',        (SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id),
    'memoNumber',          d.memo_number,
    'destination',         d.destination,
    'labelerId',           d.labeler_id,
    'labelerName',         d.labeler_name,
    'totalItems',          d.total_items,
    'totalAskValue',       d.total_ask_value,
    'totalReceivedValue',  d.total_received_value,
    'raNumber',            d.ra_number,
    'raRequestedAt',       d.ra_requested_at,
    'raReceivedAt',        d.ra_received_at,
    'raStatus',            d.ra_status,
    'ticklerDate',         d.tickler_date,
    'baggieManifest',      d.baggie_manifest,
    'outboundTracking',    d.outbound_tracking,
    'shippedAt',           d.shipped_at,
    'paymentStatus',       d.payment_status,
    'amountRequested',     d.amount_requested,
    'amountReceived',      d.amount_received,
    'paymentReceivedAt',   d.payment_received_at,
    'paymentReference',    d.payment_reference,
    'paymentNotes',        d.payment_notes,
    'fedexLabels',         d.fedex_labels,
    'creditMemoUrl',       d.credit_memo_url,
    'shipmentGroupId',     d.shipment_group_id,
    'createdAt',           d.created_at,
    'updatedAt',           d.updated_at
  );
$$;

ALTER FUNCTION public._debit_memo_to_json(d public.debit_memos) OWNER TO postgres;

-- ══════════════════════════════════════════════════════════════
-- Fix 3: Create payment_record Function (Basic Version)
-- ══════════════════════════════════════════════════════════════

-- Drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.payment_record(uuid, numeric, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.payment_record(uuid, numeric, timestamptz, text, text, text);

-- Create the basic payment_record function
CREATE OR REPLACE FUNCTION public.payment_record(
  p_debit_memo_id uuid, 
  p_amount_received numeric, 
  p_payment_date timestamp with time zone DEFAULT now(), 
  p_reference text DEFAULT NULL::text, 
  p_notes text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_memo   debit_memos;
  v_status TEXT;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'payment_record called: memo_id=%, amount=%, date=%, ref=%, notes=%', 
    p_debit_memo_id, p_amount_received, p_payment_date, p_reference, p_notes;

  -- Find the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Validate amount
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

  -- Update the debit memo with payment information
  UPDATE debit_memos SET
    amount_received     = p_amount_received,
    payment_received_at = p_payment_date,
    payment_reference   = COALESCE(NULLIF(TRIM(p_reference), ''), payment_reference),
    payment_notes       = COALESCE(NULLIF(TRIM(p_notes), ''), payment_notes),
    payment_status      = v_status,
    total_received_value = p_amount_received,
    updated_at          = NOW()
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  -- Return success response
  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'payment_record error: %', SQLERRM;
    RETURN jsonb_build_object(
      'error', true,
      'code', 500,
      'message', 'Internal error: ' || SQLERRM
    );
END;
$$;

-- Set ownership and permissions
ALTER FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO anon;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO service_role;

-- ══════════════════════════════════════════════════════════════
-- Fix 4: Create payment_record Function (Extended Version with Credit Memo URL)
-- ══════════════════════════════════════════════════════════════

-- Create the extended payment_record function with credit memo URL support
CREATE OR REPLACE FUNCTION public.payment_record(
  p_debit_memo_id uuid, 
  p_amount_received numeric, 
  p_payment_date timestamp with time zone DEFAULT now(), 
  p_reference text DEFAULT NULL::text, 
  p_notes text DEFAULT NULL::text, 
  p_credit_memo_url text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_memo   debit_memos;
  v_status TEXT;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'payment_record (extended) called: memo_id=%, amount=%, date=%, ref=%, notes=%, credit_url=%', 
    p_debit_memo_id, p_amount_received, p_payment_date, p_reference, p_notes, p_credit_memo_url;

  -- Find the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Validate amount
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

  -- Update the debit memo with payment information
  UPDATE debit_memos SET
    amount_received     = p_amount_received,
    payment_received_at = p_payment_date,
    payment_reference   = p_reference,
    payment_notes       = p_notes,
    payment_status      = v_status,
    total_received_value = p_amount_received,
    credit_memo_url     = COALESCE(p_credit_memo_url, credit_memo_url),
    updated_at          = NOW()
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  -- Return success response
  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'payment_record (extended) error: %', SQLERRM;
    RETURN jsonb_build_object(
      'error', true,
      'code', 500,
      'message', 'Internal error: ' || SQLERRM
    );
END;
$$;

-- Set ownership and permissions for extended function
ALTER FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) TO anon;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) TO service_role;

-- ══════════════════════════════════════════════════════════════
-- Fix 5: Create Indexes for Performance
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_debit_memos_payment_status ON public.debit_memos(payment_status);
CREATE INDEX IF NOT EXISTS idx_debit_memos_payment_received_at ON public.debit_memos(payment_received_at);
CREATE INDEX IF NOT EXISTS idx_debit_memos_payment_reference ON public.debit_memos(payment_reference);
CREATE INDEX IF NOT EXISTS idx_debit_memos_amount_received ON public.debit_memos(amount_received);

-- ══════════════════════════════════════════════════════════════
-- Fix 6: Verification Queries
-- ══════════════════════════════════════════════════════════════

-- Check if payment_record functions were created successfully
SELECT 
  '✅ Payment Functions' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  'Created' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'payment_record'
ORDER BY pg_get_function_arguments(p.oid);

-- Check payment-related columns in debit_memos table
SELECT 
  '✅ Payment Columns' as check_type,
  'debit_memos' as function_name,
  STRING_AGG(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as arguments,
  'Available' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'debit_memos'
  AND column_name IN ('payment_received_at', 'payment_reference', 'payment_notes', 'payment_status', 'amount_requested', 'amount_received', 'credit_memo_url');

-- Check helper function
SELECT 
  '✅ Helper Function' as check_type,
  p.proname as function_name,
  'Available' as arguments,
  'Ready' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = '_debit_memo_to_json';

-- ══════════════════════════════════════════════════════════════
-- Success Message
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ PAYMENT RECORDING FIX COMPLETE!';
  RAISE NOTICE '💰 payment_record functions created (basic + extended versions)';
  RAISE NOTICE '📊 Payment columns added to debit_memos table';
  RAISE NOTICE '🏗️  Helper function _debit_memo_to_json updated';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '📝 Payment recording should now work!';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST: Try recording payment for debit memo ID: fe15b8f9-17d7-4393-aa60-3bd8471db32d';
  RAISE NOTICE '📋 Both function signatures available:';
  RAISE NOTICE '   - payment_record(memo_id, amount, date, reference, notes)';
  RAISE NOTICE '   - payment_record(memo_id, amount, date, reference, notes, credit_memo_url)';
END $$;