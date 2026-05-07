-- ============================================================
-- Fix: create_buying_group does not save contact_phone, address,
-- or notes on INSERT — they were missing from the INSERT statement.
-- ============================================================

CREATE OR REPLACE FUNCTION create_buying_group(
  p_name TEXT,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL,
  p_admin_password_hash TEXT DEFAULT NULL,
  p_admin_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_group    JSONB;
  v_email    TEXT;
  v_name     TEXT;
BEGIN
  v_email := COALESCE(p_admin_email, p_contact_email);
  v_name  := p_name;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Email is required');
  END IF;

  IF p_admin_password_hash IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Password is required');
  END IF;

  IF EXISTS (SELECT 1 FROM admin WHERE email = v_email) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Email already exists');
  END IF;

  -- Create admin record — now includes contact_phone, address, notes
  INSERT INTO admin (
    email,
    password_hash,
    name,
    role,
    is_active,
    permissions,
    contact_phone,
    address,
    notes
  )
  VALUES (
    v_email,
    p_admin_password_hash,
    v_name,
    'super_admin',
    true,
    '["dashboard","pharmacies","distributors","marketplace","documents","payments","payout_hub","analytics","settings","admins","processors","policies","ndc_pricing","tbd_items","destruction","warehouse"]'::jsonb,
    p_contact_phone,
    p_address,
    p_notes
  )
  RETURNING id INTO v_admin_id;

  INSERT INTO admin_settings (id, business_name)
  VALUES (1, p_name)
  ON CONFLICT (id) DO UPDATE
  SET business_name = EXCLUDED.business_name,
      updated_at    = NOW();

  SELECT jsonb_build_object(
    'id',           a.id,
    'name',         a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address',      a.address,
    'notes',        a.notes,
    'status',       'active',
    'createdAt',    a.created_at,
    'role',         a.role
  )
  INTO v_group
  FROM admin a
  WHERE a.id = v_admin_id;

  RETURN jsonb_build_object(
    'error',      false,
    'message',    'Buying group created successfully',
    'buyingGroup', v_group,
    'adminId',    v_admin_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_buying_group TO authenticated, anon, service_role;
