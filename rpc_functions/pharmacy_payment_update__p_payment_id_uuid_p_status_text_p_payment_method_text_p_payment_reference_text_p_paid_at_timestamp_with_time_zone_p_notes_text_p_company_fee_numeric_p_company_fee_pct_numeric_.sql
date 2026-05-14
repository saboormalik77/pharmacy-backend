-- Function : pharmacy_payment_update
-- Arguments: p_payment_id uuid, p_status text, p_payment_method text, p_payment_reference text, p_paid_at timestamp with time zone, p_notes text, p_company_fee numeric, p_company_fee_pct numeric, p_gpo_share numeric, p_pharmacy_payout numeric, p_total_credit numeric, p_check_number text, p_check_date timestamp with time zone, p_payment_type text, p_return_reference_number text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_update(p_payment_id uuid, p_status text, p_payment_method text, p_payment_reference text, p_paid_at timestamp with time zone, p_notes text, p_company_fee numeric, p_company_fee_pct numeric, p_gpo_share numeric, p_pharmacy_payout numeric, p_total_credit numeric, p_check_number text, p_check_date timestamp with time zone, p_payment_type text, p_return_reference_number text) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_update(p_payment_id uuid, p_status text DEFAULT NULL::text, p_payment_method text DEFAULT NULL::text, p_payment_reference text DEFAULT NULL::text, p_paid_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text, p_company_fee numeric DEFAULT NULL::numeric, p_company_fee_pct numeric DEFAULT NULL::numeric, p_gpo_share numeric DEFAULT NULL::numeric, p_pharmacy_payout numeric DEFAULT NULL::numeric, p_total_credit numeric DEFAULT NULL::numeric, p_check_number text DEFAULT NULL::text, p_check_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_payment_type text DEFAULT NULL::text, p_return_reference_number text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
