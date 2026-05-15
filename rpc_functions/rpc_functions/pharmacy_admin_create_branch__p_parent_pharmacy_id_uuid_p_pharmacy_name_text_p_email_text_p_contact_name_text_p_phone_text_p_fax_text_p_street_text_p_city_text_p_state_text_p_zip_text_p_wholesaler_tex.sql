-- Function : pharmacy_admin_create_branch
-- Arguments: p_parent_pharmacy_id uuid, p_pharmacy_name text, p_email text, p_contact_name text, p_phone text, p_fax text, p_street text, p_city text, p_state text, p_zip text, p_wholesaler text, p_wholesaler_account text, p_secondary_wholesaler text, p_dea_number text, p_dea_expiration date, p_service_type text, p_days_between_visits integer, p_last_visit_date date, p_next_visit_date date, p_processor_id uuid, p_sales_person_id uuid, p_pending_role_ids uuid[]
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_admin_create_branch(p_parent_pharmacy_id uuid, p_pharmacy_name text, p_email text, p_contact_name text, p_phone text, p_fax text, p_street text, p_city text, p_state text, p_zip text, p_wholesaler text, p_wholesaler_account text, p_secondary_wholesaler text, p_dea_number text, p_dea_expiration date, p_service_type text, p_days_between_visits integer, p_last_visit_date date, p_next_visit_date date, p_processor_id uuid, p_sales_person_id uuid, p_pending_role_ids uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_admin_create_branch(p_parent_pharmacy_id uuid, p_pharmacy_name text, p_email text, p_contact_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_fax text DEFAULT NULL::text, p_street text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_zip text DEFAULT NULL::text, p_wholesaler text DEFAULT NULL::text, p_wholesaler_account text DEFAULT NULL::text, p_secondary_wholesaler text DEFAULT NULL::text, p_dea_number text DEFAULT NULL::text, p_dea_expiration date DEFAULT NULL::date, p_service_type text DEFAULT 'full_service'::text, p_days_between_visits integer DEFAULT 120, p_last_visit_date date DEFAULT NULL::date, p_next_visit_date date DEFAULT NULL::date, p_processor_id uuid DEFAULT NULL::uuid, p_sales_person_id uuid DEFAULT NULL::uuid, p_pending_role_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_parent RECORD;
  v_invite_id UUID;
  v_invite_token TEXT;
  v_rid UUID;
BEGIN
  SELECT id, pharmacy_name, parent_pharmacy_id, status, can_manage_branches
  INTO v_parent FROM pharmacy WHERE id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Parent pharmacy not found');
  END IF;
  IF v_parent.parent_pharmacy_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Branch pharmacies cannot create sub-branches');
  END IF;
  IF v_parent.can_manage_branches IS NOT TRUE THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'This pharmacy does not have branch management capability');
  END IF;
  IF v_parent.status != 'active' THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Parent pharmacy account is not active');
  END IF;

  IF p_pharmacy_name IS NULL OR TRIM(p_pharmacy_name) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Branch pharmacy name is required');
  END IF;
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Email is required');
  END IF;

  IF EXISTS (SELECT 1 FROM pharmacy WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pharmacy with this email already exists');
  END IF;
  IF EXISTS (SELECT 1 FROM pharmacy_branch_invites
             WHERE email = LOWER(TRIM(p_email)) AND status = 'pending' AND expires_at > NOW()) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pending branch invitation already exists for this email');
  END IF;
  IF EXISTS (SELECT 1 FROM pharmacy_invites
             WHERE email = LOWER(TRIM(p_email)) AND status = 'pending' AND expires_at > NOW()) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pending pharmacy invitation already exists for this email');
  END IF;

  IF p_service_type NOT IN ('full_service', 'self_service') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Service type must be full_service or self_service');
  END IF;

  IF p_pending_role_ids IS NOT NULL AND cardinality(p_pending_role_ids) > 0 THEN
    FOREACH v_rid IN ARRAY p_pending_role_ids
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pharmacy_roles
        WHERE id = v_rid AND parent_pharmacy_id = p_parent_pharmacy_id
      ) THEN
        RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'One or more role IDs are invalid or do not belong to your pharmacy');
      END IF;
    END LOOP;
  END IF;

  v_invite_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO pharmacy_branch_invites (
    parent_pharmacy_id, invite_token, email, status, expires_at,
    pharmacy_name, contact_name, phone, fax,
    street, city, state, zip,
    wholesaler, wholesaler_account, secondary_wholesaler,
    dea_number, dea_expiration,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    processor_id, sales_person_id,
    pending_role_ids
  ) VALUES (
    p_parent_pharmacy_id, v_invite_token, LOWER(TRIM(p_email)), 'pending',
    NOW() + INTERVAL '7 days',
    TRIM(p_pharmacy_name), p_contact_name, p_phone, p_fax,
    p_street, p_city, p_state, p_zip,
    p_wholesaler, p_wholesaler_account, p_secondary_wholesaler,
    p_dea_number, p_dea_expiration,
    p_service_type, COALESCE(p_days_between_visits, 120),
    p_last_visit_date, p_next_visit_date,
    p_processor_id, p_sales_person_id,
    CASE
      WHEN p_pending_role_ids IS NOT NULL AND cardinality(p_pending_role_ids) > 0 THEN p_pending_role_ids
      ELSE NULL
    END
  ) RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId', v_invite_id,
      'inviteToken', v_invite_token,
      'email', LOWER(TRIM(p_email)),
      'pharmacyName', TRIM(p_pharmacy_name),
      'parentPharmacyName', v_parent.pharmacy_name
    )
  );
END;
$function$;
