-- ============================================================
-- Sub Main Admin RPC Functions
-- Handles sub-admin CRUD, invite flow, and login
-- ============================================================

-- ============================================================
-- 1. CREATE SUB MAIN ADMIN (with invite token)
-- ============================================================

CREATE OR REPLACE FUNCTION create_sub_main_admin(
  p_email TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'sub_admin',
  p_permissions JSONB DEFAULT '[]'::jsonb,
  p_invite_token TEXT DEFAULT NULL,
  p_invite_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_admin JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM sub_main_admin WHERE email = p_email) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Email already exists');
  END IF;

  INSERT INTO sub_main_admin (email, name, role, permissions, invite_token, invite_expires_at, created_by)
  VALUES (p_email, p_name, p_role, p_permissions, p_invite_token, p_invite_expires_at, p_created_by)
  RETURNING id INTO v_admin_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name,
    'role', s.role,
    'permissions', CASE 
      WHEN jsonb_typeof(s.permissions) = 'array' THEN s.permissions
      ELSE '[]'::jsonb
    END,
    'is_active', s.is_active,
    'invite_token', s.invite_token,
    'invite_expires_at', s.invite_expires_at,
    'created_at', s.created_at
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.id = v_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Sub admin created successfully', 'admin', v_admin);
END;
$$;

-- ============================================================
-- 2. LIST SUB MAIN ADMINS
-- ============================================================

CREATE OR REPLACE FUNCTION get_sub_main_admins_list(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_admins JSONB;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM sub_main_admin s
  WHERE
    (p_search IS NULL OR p_search = '' OR
      s.name ILIKE '%' || p_search || '%' OR
      s.email ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR
      (p_status = 'active' AND s.is_active = true) OR
      (p_status = 'inactive' AND s.is_active = false));

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_admins
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'email', s.email,
      'name', s.name,
      'role', s.role,
      'permissions', CASE 
        WHEN jsonb_typeof(s.permissions) = 'array' THEN s.permissions
        ELSE '[]'::jsonb
      END,
      'is_active', s.is_active,
      'invite_accepted_at', s.invite_accepted_at,
      'last_login_at', s.last_login_at,
      'created_at', s.created_at,
      'updated_at', s.updated_at
    ) AS row_data
    FROM sub_main_admin s
    WHERE
      (p_search IS NULL OR p_search = '' OR
        s.name ILIKE '%' || p_search || '%' OR
        s.email ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR
        (p_status = 'active' AND s.is_active = true) OR
        (p_status = 'inactive' AND s.is_active = false))
    ORDER BY s.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'admins', v_admins,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::NUMERIC / p_limit)::INTEGER
    )
  );
END;
$$;

-- ============================================================
-- 3. GET SUB MAIN ADMIN BY ID
-- ============================================================

CREATE OR REPLACE FUNCTION get_sub_main_admin_by_id(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
  v_permissions JSONB;
BEGIN
  SELECT s.permissions INTO v_permissions
  FROM sub_main_admin s
  WHERE s.id = p_admin_id;

  IF v_permissions IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Sub admin not found');
  END IF;

  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name,
    'role', s.role,
    'permissions', CASE 
      WHEN jsonb_typeof(s.permissions) = 'array' THEN s.permissions
      ELSE '[]'::jsonb
    END,
    'is_active', s.is_active,
    'invite_accepted_at', s.invite_accepted_at,
    'last_login_at', s.last_login_at,
    'created_at', s.created_at,
    'updated_at', s.updated_at
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.id = p_admin_id;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$$;

-- ============================================================
-- 4. UPDATE SUB MAIN ADMIN
-- ============================================================

CREATE OR REPLACE FUNCTION update_sub_main_admin(
  p_admin_id UUID,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_permissions JSONB DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sub_main_admin WHERE id = p_admin_id) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Sub admin not found');
  END IF;

  IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM sub_main_admin WHERE email = p_email AND id != p_admin_id) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Email already exists');
  END IF;

  UPDATE sub_main_admin
  SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    role = COALESCE(p_role, role),
    permissions = COALESCE(p_permissions, permissions),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_admin_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name,
    'role', s.role,
    'permissions', CASE 
      WHEN jsonb_typeof(s.permissions) = 'array' THEN s.permissions
      ELSE '[]'::jsonb
    END,
    'is_active', s.is_active,
    'invite_accepted_at', s.invite_accepted_at,
    'last_login_at', s.last_login_at,
    'created_at', s.created_at,
    'updated_at', s.updated_at
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.id = p_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Sub admin updated successfully', 'admin', v_admin);
END;
$$;

-- ============================================================
-- 5. DELETE SUB MAIN ADMIN
-- ============================================================

CREATE OR REPLACE FUNCTION delete_sub_main_admin(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sub_main_admin WHERE id = p_admin_id) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Sub admin not found');
  END IF;

  DELETE FROM sub_main_admin WHERE id = p_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Sub admin deleted successfully');
END;
$$;

-- ============================================================
-- 6. GET SUB MAIN ADMIN BY EMAIL (for login)
-- ============================================================

CREATE OR REPLACE FUNCTION get_sub_main_admin_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'password_hash', s.password_hash,
    'name', s.name,
    'role', s.role,
    'permissions', CASE 
      WHEN jsonb_typeof(s.permissions) = 'array' THEN s.permissions
      ELSE '[]'::jsonb
    END,
    'is_active', s.is_active,
    'last_login_at', s.last_login_at
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.email = p_email;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$$;

-- ============================================================
-- 7. UPDATE SUB MAIN ADMIN LAST LOGIN
-- ============================================================

CREATE OR REPLACE FUNCTION update_sub_main_admin_last_login(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sub_main_admin SET last_login_at = NOW() WHERE id = p_admin_id;
END;
$$;

-- ============================================================
-- 8. ACCEPT SUB ADMIN INVITE (set password via invite token)
-- ============================================================

CREATE OR REPLACE FUNCTION accept_sub_admin_invite(
  p_invite_token TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id
  FROM sub_main_admin
  WHERE invite_token = p_invite_token
    AND invite_expires_at > NOW()
    AND invite_accepted_at IS NULL;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid or expired invite token');
  END IF;

  UPDATE sub_main_admin
  SET
    password_hash = p_password_hash,
    invite_accepted_at = NOW(),
    invite_token = NULL,
    updated_at = NOW()
  WHERE id = v_admin_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name,
    'role', s.role
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.id = v_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Account setup complete', 'admin', v_admin);
END;
$$;

-- ============================================================
-- 9. VALIDATE INVITE TOKEN (check if valid before showing form)
-- ============================================================

CREATE OR REPLACE FUNCTION validate_sub_admin_invite_token(p_invite_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.invite_token = p_invite_token
    AND s.invite_expires_at > NOW()
    AND s.invite_accepted_at IS NULL;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid or expired invite token');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$$;

-- ============================================================
-- 10. RESEND INVITE (regenerate token)
-- ============================================================

CREATE OR REPLACE FUNCTION resend_sub_admin_invite(
  p_admin_id UUID,
  p_invite_token TEXT,
  p_invite_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sub_main_admin WHERE id = p_admin_id AND invite_accepted_at IS NULL) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Sub admin not found or already accepted invite');
  END IF;

  UPDATE sub_main_admin
  SET
    invite_token = p_invite_token,
    invite_expires_at = p_invite_expires_at,
    updated_at = NOW()
  WHERE id = p_admin_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.id = p_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Invite resent', 'admin', v_admin);
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION create_sub_main_admin TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_sub_main_admins_list TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_sub_main_admin_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_sub_main_admin TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_sub_main_admin TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_sub_main_admin_by_email TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_sub_main_admin_last_login TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION accept_sub_admin_invite TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION validate_sub_admin_invite_token TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION resend_sub_admin_invite TO authenticated, anon, service_role;
