-- ================================================================
-- SIMPLE FIX: Missing pharmacy_payment_create Function
-- ================================================================
-- This script creates just the missing pharmacy_payment_create function
-- that the API needs to create pharmacy payment records
-- ================================================================

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

  -- Return success response with basic JSON if helper function doesn't exist
  BEGIN
    RETURN jsonb_build_object(
      'error', false,
      'data', _pharmacy_payment_to_json(v_payment)
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- Fallback response if _pharmacy_payment_to_json doesn't exist
      RETURN jsonb_build_object(
        'error', false,
        'data', jsonb_build_object(
          'id', v_payment.id,
          'pharmacyId', v_payment.pharmacy_id,
          'batchId', v_payment.batch_id,
          'totalCreditReceived', v_payment.total_credit_received,
          'companyFee', v_payment.company_fee,
          'companyFeePercent', v_payment.company_fee_percent,
          'gpoShare', v_payment.gpo_share,
          'pharmacyPayout', v_payment.pharmacy_payout,
          'paymentMethod', v_payment.payment_method,
          'paymentReference', v_payment.payment_reference,
          'status', v_payment.status,
          'notes', v_payment.notes,
          'createdBy', v_payment.created_by,
          'createdAt', v_payment.created_at,
          'updatedAt', v_payment.updated_at
        )
      );
  END;
END;
$$;

-- Set permissions
ALTER FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) OWNER TO postgres;
GRANT ALL ON FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) TO anon;
GRANT ALL ON FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.pharmacy_payment_create(uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, uuid) TO service_role;

-- Verify the fix
SELECT 'Pharmacy payment create function added successfully!' as status;