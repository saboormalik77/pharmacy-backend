-- Fix: The GRANT had 21 types but the function has 22 parameters.
-- p_dea_number TEXT was missing from the type list, causing every GRANT to fail,
-- which rolled back the entire transaction (including the CREATE).

-- Step 1: Add the missing column
ALTER TABLE pharmacy_branch_invites 
ADD COLUMN IF NOT EXISTS pending_role_ids UUID[];

-- Step 2: Drop the old 21-arg function (without p_pending_role_ids)
DROP FUNCTION IF EXISTS pharmacy_admin_create_branch(
  uuid, text, text, text, text, text, text, text, text, text, 
  text, text, text, text, date, text, integer, date, date, uuid, uuid
) CASCADE;

-- Step 3: Create the 22-argument function
CREATE OR REPLACE FUNCTION pharmacy_admin_create_branch(
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

-- Step 4: Grant with the CORRECT 22-type signature
-- 22 types: UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER,DATE,DATE,UUID,UUID,UUID[]
--           1    2    3    4    5    6    7    8    9   10   11   12   13   14  15   16  17      18   19   20   21   22
GRANT EXECUTE ON FUNCTION pharmacy_admin_create_branch(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER,DATE,DATE,UUID,UUID,UUID[]) TO service_role;

-- Step 5: Clean up test functions from debug script
DROP FUNCTION IF EXISTS test_pharmacy_admin_create_branch CASCADE;
DROP FUNCTION IF EXISTS test_pharmacy_admin_create_branch_sig CASCADE;

-- Step 6: Verify
SELECT p.proname, p.pronargs, pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'pharmacy_admin_create_branch' AND n.nspname = 'public';