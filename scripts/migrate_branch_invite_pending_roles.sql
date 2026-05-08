-- One-time migration: pending roles on branch invites (assign at setup completion).
-- Run in Supabase SQL Editor after the original branch system script.

ALTER TABLE pharmacy_branch_invites
  ADD COLUMN IF NOT EXISTS pending_role_ids UUID[];

-- Remove every overload so CREATE always installs the canonical 21-arg version.
-- (A mismatched DROP leaves the old function; PostgREST then calls the new signature and fails with 42883.)
DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'pharmacy_admin_create_branch'
      AND n.nspname = 'public'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', fn);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.pharmacy_admin_create_branch(
  p_parent_pharmacy_id  UUID,
  p_pharmacy_name       TEXT,
  p_email               TEXT,
  p_contact_name        TEXT DEFAULT NULL,
  p_phone               TEXT DEFAULT NULL,
  p_fax                 TEXT DEFAULT NULL,
  p_street              TEXT DEFAULT NULL,
  p_city                TEXT DEFAULT NULL,
  p_state               TEXT DEFAULT NULL,
  p_zip                 TEXT DEFAULT NULL,
  p_wholesaler          TEXT DEFAULT NULL,
  p_wholesaler_account  TEXT DEFAULT NULL,
  p_secondary_wholesaler TEXT DEFAULT NULL,
  p_dea_number          TEXT DEFAULT NULL,
  p_dea_expiration      DATE DEFAULT NULL,
  p_service_type        TEXT DEFAULT 'full_service',
  p_days_between_visits INTEGER DEFAULT 120,
  p_last_visit_date     DATE DEFAULT NULL,
  p_next_visit_date     DATE DEFAULT NULL,
  p_processor_id        UUID DEFAULT NULL,
  p_sales_person_id     UUID DEFAULT NULL,
  p_pending_role_ids    UUID[] DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

CREATE OR REPLACE FUNCTION complete_branch_setup(
  p_token        TEXT,
  p_auth_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
  v_pharmacy_id UUID;
  v_address JSONB;
  v_role_id UUID;
BEGIN
  SELECT * INTO v_invite
  FROM pharmacy_branch_invites
  WHERE invite_token = TRIM(p_token) AND status = 'pending' AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid or expired invite');
  END IF;

  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city',   COALESCE(v_invite.city, ''),
    'state',  COALESCE(v_invite.state, ''),
    'zip',    COALESCE(v_invite.zip, '')
  );

  INSERT INTO pharmacy (
    id, email, name, pharmacy_name, phone,
    physical_address, status, parent_pharmacy_id, can_manage_branches,
    dea_number, dea_expiration_date, fax_number,
    primary_wholesaler, wholesaler_account_number, secondary_wholesaler,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    assigned_processor_id, assigned_sales_person_id,
    created_at, updated_at
  ) VALUES (
    p_auth_user_id, v_invite.email,
    COALESCE(v_invite.contact_name, v_invite.pharmacy_name),
    v_invite.pharmacy_name, v_invite.phone,
    v_address, 'active', v_invite.parent_pharmacy_id, FALSE,
    v_invite.dea_number, v_invite.dea_expiration, v_invite.fax,
    v_invite.wholesaler, v_invite.wholesaler_account, v_invite.secondary_wholesaler,
    v_invite.service_type, v_invite.days_between_visits,
    v_invite.last_visit_date, v_invite.next_visit_date,
    v_invite.processor_id, v_invite.sales_person_id,
    NOW(), NOW()
  ) RETURNING id INTO v_pharmacy_id;

  IF v_invite.pending_role_ids IS NOT NULL AND cardinality(v_invite.pending_role_ids) > 0 THEN
    FOREACH v_role_id IN ARRAY v_invite.pending_role_ids
    LOOP
      IF EXISTS (
        SELECT 1 FROM pharmacy_roles
        WHERE id = v_role_id AND parent_pharmacy_id = v_invite.parent_pharmacy_id
      ) THEN
        INSERT INTO pharmacy_branch_role_assignments (branch_pharmacy_id, role_id, assigned_by)
        VALUES (v_pharmacy_id, v_role_id, v_invite.parent_pharmacy_id)
        ON CONFLICT (branch_pharmacy_id, role_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  UPDATE pharmacy_branch_invites
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId',       v_pharmacy_id,
      'parentPharmacyId', v_invite.parent_pharmacy_id,
      'status',           'active'
    )
  );
END;
$$;

DO $grant_branch_rpc$
DECLARE
  r regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO r
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'pharmacy_admin_create_branch'
    AND n.nspname = 'public'
    AND p.pronargs = 21;

  IF r IS NULL THEN
    RAISE EXCEPTION 'pharmacy_admin_create_branch (21 args) was not created; check errors above';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r);
END $grant_branch_rpc$;

DO $grant_complete_branch$
DECLARE
  r regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO r
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'complete_branch_setup'
    AND n.nspname = 'public'
    AND p.pronargs = 2;

  IF r IS NULL THEN
    RAISE EXCEPTION 'complete_branch_setup was not found';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r);
END $grant_complete_branch$;
