-- ================================================================
-- FIX: Payment Status Logic for Zero Amount Requested Memos
-- ================================================================
-- This script fixes the issue where memos with $0.00 amount_requested 
-- never get marked as "paid" even when payments are recorded.
--
-- Problem: The current logic requires amount_requested > 0 to mark as "paid"
-- Solution: Update the logic to handle zero-amount cases properly
-- ================================================================

-- ══════════════════════════════════════════════════════════════
-- Fix 1: Update payment_record Function with Better Payment Status Logic
-- ══════════════════════════════════════════════════════════════

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

  -- IMPROVED PAYMENT STATUS LOGIC:
  -- Handle the case where amount_requested is 0 or very small
  IF v_memo.amount_requested <= 0 THEN
    -- If no amount was requested, any payment amount should mark it as paid
    IF p_amount_received > 0 THEN
      v_status := 'paid';
    ELSE
      v_status := 'pending';
    END IF;
  ELSE
    -- Normal logic when amount_requested > 0
    IF p_amount_received >= v_memo.amount_requested THEN
      v_status := 'paid';
    ELSIF p_amount_received > 0 THEN
      v_status := 'partial';
    ELSE
      v_status := 'pending';
    END IF;
  END IF;

  -- Log the payment status decision
  RAISE NOTICE 'Payment status calculation: amount_requested=%, amount_received=%, status=%', 
    v_memo.amount_requested, p_amount_received, v_status;

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
    'data', jsonb_build_object(
      'id', v_memo.id,
      'memoNumber', v_memo.memo_number,
      'paymentStatus', v_memo.payment_status,
      'amountRequested', v_memo.amount_requested,
      'amountReceived', v_memo.amount_received,
      'paymentReceivedAt', v_memo.payment_received_at,
      'paymentReference', v_memo.payment_reference,
      'paymentNotes', v_memo.payment_notes,
      'updatedAt', v_memo.updated_at
    )
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

-- ══════════════════════════════════════════════════════════════
-- Fix 2: Update Extended payment_record Function (with credit_memo_url)
-- ══════════════════════════════════════════════════════════════

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

  -- IMPROVED PAYMENT STATUS LOGIC:
  -- Handle the case where amount_requested is 0 or very small
  IF v_memo.amount_requested <= 0 THEN
    -- If no amount was requested, any payment amount should mark it as paid
    IF p_amount_received > 0 THEN
      v_status := 'paid';
    ELSE
      v_status := 'pending';
    END IF;
  ELSE
    -- Normal logic when amount_requested > 0
    IF p_amount_received >= v_memo.amount_requested THEN
      v_status := 'paid';
    ELSIF p_amount_received > 0 THEN
      v_status := 'partial';
    ELSE
      v_status := 'pending';
    END IF;
  END IF;

  -- Log the payment status decision
  RAISE NOTICE 'Payment status calculation (extended): amount_requested=%, amount_received=%, status=%', 
    v_memo.amount_requested, p_amount_received, v_status;

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

  -- Return success response with full memo data if _debit_memo_to_json exists
  BEGIN
    RETURN jsonb_build_object(
      'error', false,
      'data', _debit_memo_to_json(v_memo)
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- Fallback if _debit_memo_to_json doesn't exist
      RETURN jsonb_build_object(
        'error', false,
        'data', jsonb_build_object(
          'id', v_memo.id,
          'memoNumber', v_memo.memo_number,
          'paymentStatus', v_memo.payment_status,
          'amountRequested', v_memo.amount_requested,
          'amountReceived', v_memo.amount_received,
          'paymentReceivedAt', v_memo.payment_received_at,
          'paymentReference', v_memo.payment_reference,
          'paymentNotes', v_memo.payment_notes,
          'creditMemoUrl', v_memo.credit_memo_url,
          'updatedAt', v_memo.updated_at
        )
      );
  END;

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

-- ══════════════════════════════════════════════════════════════
-- Fix 3: Set Ownership and Permissions
-- ══════════════════════════════════════════════════════════════

ALTER FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO anon;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text) TO service_role;

ALTER FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) TO anon;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.payment_record(uuid, numeric, timestamptz, text, text, text) TO service_role;

-- ══════════════════════════════════════════════════════════════
-- Fix 4: Create Helper Function to Fix Existing Memos with Wrong Status
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fix_payment_status_for_zero_amount_memos() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Fix memos where amount_requested is 0 but payment was received and status is still 'partial'
  UPDATE debit_memos SET
    payment_status = 'paid',
    updated_at = NOW()
  WHERE amount_requested <= 0 
    AND amount_received > 0 
    AND payment_status = 'partial';
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN 'Fixed payment status for ' || v_updated_count || ' memos with zero amount requested';
END;
$$;

-- Run the fix for existing memos
SELECT fix_payment_status_for_zero_amount_memos();

-- ══════════════════════════════════════════════════════════════
-- Fix 5: Verification Queries
-- ══════════════════════════════════════════════════════════════

-- Check for memos that might have the wrong payment status
SELECT 
  '🔍 Status Check' as check_type,
  COUNT(*) as function_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'Memos with potential status issues found'
    ELSE 'All payment statuses look correct'
  END as arguments,
  'Review needed' as status
FROM debit_memos 
WHERE (amount_requested <= 0 AND amount_received > 0 AND payment_status != 'paid')
   OR (amount_requested > 0 AND amount_received >= amount_requested AND payment_status != 'paid')
   OR (amount_requested > 0 AND amount_received > 0 AND amount_received < amount_requested AND payment_status != 'partial')
   OR (amount_received = 0 AND payment_status != 'pending');

-- Check the specific memo from your example
SELECT 
  memo_number,
  amount_requested,
  amount_received, 
  payment_status,
  CASE 
    WHEN amount_requested <= 0 AND amount_received > 0 THEN 'Should be PAID'
    WHEN amount_requested > 0 AND amount_received >= amount_requested THEN 'Should be PAID' 
    WHEN amount_requested > 0 AND amount_received > 0 THEN 'Should be PARTIAL'
    ELSE 'Should be PENDING'
  END as expected_status
FROM debit_memos 
WHERE memo_number = 'DM-0526-0001' 
   OR id = 'fe15b8f9-17d7-4393-aa60-3bd8471db32d';

-- ══════════════════════════════════════════════════════════════
-- Success Message
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ PAYMENT STATUS LOGIC FIX COMPLETE!';
  RAISE NOTICE '🔧 Updated payment_record functions with improved status logic';
  RAISE NOTICE '💰 Zero-amount memos will now be marked as "paid" when payment received';
  RAISE NOTICE '📊 Existing problematic memos have been fixed';
  RAISE NOTICE '🎯 Paid memos should now disappear from "Unpaid Memos" list';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST: Record another payment for DM-0526-0001 and verify it moves to "Paid Memos" tab';
END $$;