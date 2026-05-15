-- Function : admin_create_pharmacy
-- Arguments: p_pharmacy_name text, p_email text, p_contact_name text, p_phone text, p_fax text, p_street text, p_city text, p_state text, p_zip text, p_wholesaler text, p_wholesaler_account text, p_secondary_wholesaler text, p_dea_number text, p_dea_expiration date, p_service_type text, p_days_between_visits integer, p_last_visit_date date, p_next_visit_date date, p_processor_id uuid, p_sales_person_id uuid, p_created_by text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.admin_create_pharmacy(p_pharmacy_name text, p_email text, p_contact_name text, p_phone text, p_fax text, p_street text, p_city text, p_state text, p_zip text, p_wholesaler text, p_wholesaler_account text, p_secondary_wholesaler text, p_dea_number text, p_dea_expiration date, p_service_type text, p_days_between_visits integer, p_last_visit_date date, p_next_visit_date date, p_processor_id uuid, p_sales_person_id uuid, p_created_by text) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_create_pharmacy(p_pharmacy_name text, p_email text, p_contact_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_fax text DEFAULT NULL::text, p_street text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_zip text DEFAULT NULL::text, p_wholesaler text DEFAULT NULL::text, p_wholesaler_account text DEFAULT NULL::text, p_secondary_wholesaler text DEFAULT NULL::text, p_dea_number text DEFAULT NULL::text, p_dea_expiration date DEFAULT NULL::date, p_service_type text DEFAULT 'full_service'::text, p_days_between_visits integer DEFAULT 120, p_last_visit_date date DEFAULT NULL::date, p_next_visit_date date DEFAULT NULL::date, p_processor_id uuid DEFAULT NULL::uuid, p_sales_person_id uuid DEFAULT NULL::uuid, p_created_by text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite_id UUID;
  v_invite_token TEXT;
BEGIN
  -- Validate required fields
  IF p_pharmacy_name IS NULL OR TRIM(p_pharmacy_name) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Pharmacy name is required');
  END IF;

  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Email is required');
  END IF;

  -- Check if email already exists in pharmacy table
  IF EXISTS (SELECT 1 FROM pharmacy WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pharmacy with this email already exists');
  END IF;

  -- Check if email already has a pending invite
  IF EXISTS (SELECT 1 FROM pharmacy_invites WHERE email = LOWER(TRIM(p_email)) AND status = 'pending' AND expires_at > NOW()) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pending invitation already exists for this email');
  END IF;

  -- Validate service type
  IF p_service_type NOT IN ('full_service', 'self_service') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Service type must be full_service or self_service');
  END IF;

  -- Generate invite token (URL-safe random string)
  v_invite_token := encode(gen_random_bytes(32), 'hex');

  -- Create invite record with all pharmacy data
  INSERT INTO pharmacy_invites (
    invite_token, email, status, expires_at, created_by,
    pharmacy_name, contact_name, phone, fax,
    street, city, state, zip,
    wholesaler, wholesaler_account, secondary_wholesaler,
    dea_number, dea_expiration,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    processor_id, sales_person_id
  ) VALUES (
    v_invite_token,
    LOWER(TRIM(p_email)),
    'pending',
    NOW() + INTERVAL '7 days',
    p_created_by,
    TRIM(p_pharmacy_name),
    p_contact_name,
    p_phone,
    p_fax,
    p_street,
    p_city,
    p_state,
    p_zip,
    p_wholesaler,
    p_wholesaler_account,
    p_secondary_wholesaler,
    p_dea_number,
    p_dea_expiration,
    p_service_type,
    COALESCE(p_days_between_visits, 120),
    p_last_visit_date,
    p_next_visit_date,
    p_processor_id,
    p_sales_person_id
  ) RETURNING id INTO v_invite_id;

  -- Return success with invite ID and token
  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId', v_invite_id,
      'inviteToken', v_invite_token,
      'email', LOWER(TRIM(p_email)),
      'pharmacyName', TRIM(p_pharmacy_name)
    )
  );
END;
$function$;
