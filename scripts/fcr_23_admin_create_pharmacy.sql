-- ============================================================
-- FCR 23: Admin Create Pharmacy
-- Allows admins to create a pharmacy account with an invite token.
-- The pharmacy owner receives an email with a link to set their
-- password and complete account setup.
--
-- Creates:
--   1. pharmacy_invites table — stores invite tokens
--   2. RPC: admin_create_pharmacy — creates auth user + pharmacy + invite
--   3. RPC: verify_pharmacy_invite — validates token & returns pharmacy info
--   4. RPC: complete_pharmacy_setup — sets password & activates account
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. pharmacy_invites table
-- ────────────────────────────────────────────────────────────

-- Create base table if it doesn't exist
CREATE TABLE IF NOT EXISTS pharmacy_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_token    TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired')),
  expires_at      TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate from old schema: remove pharmacy_id column if it exists
-- (Old design stored pharmacy_id as FK → pharmacy. New design stores
--  all pharmacy data directly in the invite row, and creates the
--  pharmacy record only when setup is completed.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'pharmacy_invites' AND column_name = 'pharmacy_id') THEN
    ALTER TABLE pharmacy_invites DROP COLUMN pharmacy_id;
  END IF;
END $$;

-- Add pharmacy data columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add pharmacy_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'pharmacy_name') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN pharmacy_name TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add contact_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'contact_name') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN contact_name TEXT;
  END IF;

  -- Add phone column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'phone') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN phone TEXT;
  END IF;

  -- Add fax column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'fax') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN fax TEXT;
  END IF;

  -- Add address columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'street') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN street TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'city') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'state') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'zip') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN zip TEXT;
  END IF;

  -- Add wholesaler columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'wholesaler') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN wholesaler TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'wholesaler_account') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN wholesaler_account TEXT;
  END IF;

  -- Add DEA columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'dea_number') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN dea_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'dea_expiration') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN dea_expiration DATE;
  END IF;

  -- Add service and schedule columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'service_type') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN service_type TEXT DEFAULT 'full_service';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'days_between_visits') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN days_between_visits INTEGER DEFAULT 120;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'last_visit_date') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN last_visit_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'next_visit_date') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN next_visit_date DATE;
  END IF;

  -- Add staff assignment columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'processor_id') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN processor_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'sales_person_id') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN sales_person_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pharmacy_invites' AND column_name = 'secondary_wholesaler') THEN
    ALTER TABLE pharmacy_invites ADD COLUMN secondary_wholesaler TEXT;
  END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_token   ON pharmacy_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_email   ON pharmacy_invites(email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_status  ON pharmacy_invites(status);

ALTER TABLE pharmacy_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on pharmacy_invites" ON pharmacy_invites;
CREATE POLICY "Service role full access on pharmacy_invites"
  ON pharmacy_invites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2. RPC: admin_create_pharmacy
--    Creates a new pharmacy record (no auth user yet - that
--    happens when the pharmacy completes setup).
--    Returns the pharmacy ID and invite token.
-- ────────────────────────────────────────────────────────────

-- Drop old signature (without p_secondary_wholesaler) to avoid ambiguity
DROP FUNCTION IF EXISTS admin_create_pharmacy(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, INTEGER, DATE, DATE, UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION admin_create_pharmacy(
  p_pharmacy_name     TEXT,
  p_email             TEXT,
  p_contact_name      TEXT DEFAULT NULL,
  p_phone             TEXT DEFAULT NULL,
  p_fax               TEXT DEFAULT NULL,
  p_street            TEXT DEFAULT NULL,
  p_city              TEXT DEFAULT NULL,
  p_state             TEXT DEFAULT NULL,
  p_zip               TEXT DEFAULT NULL,
  p_wholesaler        TEXT DEFAULT NULL,
  p_wholesaler_account TEXT DEFAULT NULL,
  p_secondary_wholesaler TEXT DEFAULT NULL,
  p_dea_number        TEXT DEFAULT NULL,
  p_dea_expiration    DATE DEFAULT NULL,
  p_service_type      TEXT DEFAULT 'full_service',
  p_days_between_visits INTEGER DEFAULT 120,
  p_last_visit_date   DATE DEFAULT NULL,
  p_next_visit_date   DATE DEFAULT NULL,
  p_processor_id      UUID DEFAULT NULL,
  p_sales_person_id   UUID DEFAULT NULL,
  p_created_by        TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ────────────────────────────────────────────────────────────
-- 3. RPC: verify_pharmacy_invite
--    Validates an invite token and returns pharmacy details
--    so the setup page can pre-populate fields.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION verify_pharmacy_invite(
  p_token TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
  v_address JSONB;
BEGIN
  IF p_token IS NULL OR TRIM(p_token) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invite token is required');
  END IF;

  -- Look up the invite
  SELECT * INTO v_invite
  FROM pharmacy_invites
  WHERE invite_token = TRIM(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Invalid invite link');
  END IF;

  -- Check if already completed
  IF v_invite.status = 'completed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'This invite has already been used. Please log in instead.');
  END IF;

  -- Check if expired
  IF v_invite.expires_at < NOW() THEN
    UPDATE pharmacy_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('error', true, 'code', 410, 'message', 'This invite link has expired. Please contact your administrator.');
  END IF;

  -- Build address object from invite data
  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city', COALESCE(v_invite.city, ''),
    'state', COALESCE(v_invite.state, ''),
    'zip', COALESCE(v_invite.zip, '')
  );

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId', v_invite.id,
      'email', v_invite.email,
      'pharmacyName', v_invite.pharmacy_name,
      'contactName', v_invite.contact_name,
      'phone', v_invite.phone,
      'fax', v_invite.fax,
      'deaNumber', v_invite.dea_number,
      'physicalAddress', v_address,
      'serviceType', v_invite.service_type,
      'wholesaler', v_invite.wholesaler,
      'wholesalerAccount', v_invite.wholesaler_account
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. RPC: complete_pharmacy_setup
--    Called after the pharmacy sets their password.
--    Marks invite as completed and activates the pharmacy.
-- ────────────────────────────────────────────────────────────

-- Drop existing function first (parameter signature changed)
DROP FUNCTION IF EXISTS complete_pharmacy_setup(text, uuid);

CREATE OR REPLACE FUNCTION complete_pharmacy_setup(
  p_token         TEXT,
  p_auth_user_id  UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
  v_pharmacy_id UUID;
  v_address JSONB;
BEGIN
  -- Validate token
  SELECT * INTO v_invite
  FROM pharmacy_invites
  WHERE invite_token = TRIM(p_token)
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid or expired invite');
  END IF;

  -- Build address object
  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city', COALESCE(v_invite.city, ''),
    'state', COALESCE(v_invite.state, ''),
    'zip', COALESCE(v_invite.zip, '')
  );

  -- Create the pharmacy record now with the auth user ID
  INSERT INTO pharmacy (
    id, email, name, pharmacy_name, phone,
    physical_address, status,
    dea_number, dea_expiration_date, fax_number,
    primary_wholesaler, wholesaler_account_number, secondary_wholesaler,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    assigned_processor_id, assigned_sales_person_id,
    created_at, updated_at
  ) VALUES (
    p_auth_user_id,
    v_invite.email,
    COALESCE(v_invite.contact_name, v_invite.pharmacy_name),
    v_invite.pharmacy_name,
    v_invite.phone,
    v_address,
    'active',
    v_invite.dea_number,
    v_invite.dea_expiration,
    v_invite.fax,
    v_invite.wholesaler,
    v_invite.wholesaler_account,
    v_invite.secondary_wholesaler,
    v_invite.service_type,
    v_invite.days_between_visits,
    v_invite.last_visit_date,
    v_invite.next_visit_date,
    v_invite.processor_id,
    v_invite.sales_person_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_pharmacy_id;

  -- Mark invite as completed
  UPDATE pharmacy_invites
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId', v_pharmacy_id,
      'status', 'active'
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Permissions
-- ────────────────────────────────────────────────────────────

GRANT ALL ON pharmacy_invites TO service_role;
GRANT EXECUTE ON FUNCTION admin_create_pharmacy(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER,DATE,DATE,UUID,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION verify_pharmacy_invite(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_pharmacy_setup(TEXT,UUID) TO service_role;


-- ────────────────────────────────────────────────────────────
-- 6. Comments
-- ────────────────────────────────────────────────────────────

COMMENT ON TABLE pharmacy_invites IS 'Stores invite tokens for admin-created pharmacy accounts';
COMMENT ON FUNCTION admin_create_pharmacy(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER,DATE,DATE,UUID,UUID,TEXT) IS 'Admin creates a pharmacy record and generates an invite token';
COMMENT ON FUNCTION verify_pharmacy_invite(TEXT) IS 'Validates an invite token and returns pharmacy details for setup';
COMMENT ON FUNCTION complete_pharmacy_setup IS 'Marks invite as completed and activates the pharmacy account';
