-- Function : pharmacy_payment_create
-- Arguments: p_pharmacy_id uuid, p_batch_id uuid, p_total_credit_received numeric, p_company_fee_percent numeric, p_company_fee numeric, p_gpo_share numeric, p_pharmacy_payout numeric, p_payment_method text, p_payment_reference text, p_notes text, p_created_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_create(p_pharmacy_id uuid, p_batch_id uuid, p_total_credit_received numeric, p_company_fee_percent numeric, p_company_fee numeric, p_gpo_share numeric, p_pharmacy_payout numeric, p_payment_method text, p_payment_reference text, p_notes text, p_created_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_create(p_pharmacy_id uuid, p_batch_id uuid DEFAULT NULL::uuid, p_total_credit_received numeric DEFAULT 0, p_company_fee_percent numeric DEFAULT 27.0, p_company_fee numeric DEFAULT 0, p_gpo_share numeric DEFAULT 0, p_pharmacy_payout numeric DEFAULT 0, p_payment_method text DEFAULT NULL::text, p_payment_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
