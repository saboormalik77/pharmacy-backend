-- Function : pharmacy_payment_check_pdf_data
-- Arguments: p_check_number text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_check_pdf_data(p_check_number text) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_check_pdf_data(p_check_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_payment              pharmacy_payments;
  v_pharmacy_data        jsonb;
  v_manufacturer_credits jsonb;
BEGIN
  SELECT * INTO v_payment 
  FROM pharmacy_payments 
  WHERE check_number = p_check_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Check not found');
  END IF;

  SELECT jsonb_build_object(
    'pharmacyName', p.pharmacy_name,
    'address',      COALESCE(p.physical_address->>'street', ''),
    'city',         COALESCE(p.physical_address->>'city', ''),
    'state',        COALESCE(p.physical_address->>'state', ''),
    'zipCode',      COALESCE(p.physical_address->>'zip', ''),
    'storeNumber',  COALESCE(p.store_number, '')
  ) INTO v_pharmacy_data
  FROM pharmacy p
  WHERE p.id = v_payment.pharmacy_id;

  SELECT _get_manufacturer_credits(v_payment.id) INTO v_manufacturer_credits;

  IF v_manufacturer_credits IS NULL THEN
    v_manufacturer_credits := jsonb_build_object(
      'included', '[]'::jsonb,
      'direct',   '[]'::jsonb,
      'por',      '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'payment',               _pharmacy_payment_to_json(v_payment),
      'pharmacy',              v_pharmacy_data,
      'manufacturerCredits',   v_manufacturer_credits,
      'rsiAddress',            jsonb_build_object(
        'street',  '10635 Dutchtown Road',
        'city',    'Carteret',
        'state',   'NJ',
        'zipCode', '07008'
      )
    )
  );
END;
$function$;
