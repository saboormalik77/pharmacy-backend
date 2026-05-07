-- ============================================================
-- Main Admin RPC Functions
-- Handles main admin auth and buying groups CRUD
-- ============================================================

-- ============================================================
-- 1. MAIN ADMIN LOGIN LOOKUP
-- Returns main admin data for login verification (password check in app layer)
-- ============================================================

CREATE OR REPLACE FUNCTION get_main_admin_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ma.id,
    'email', ma.email,
    'password_hash', ma.password_hash,
    'name', ma.name,
    'is_active', ma.is_active,
    'last_login_at', ma.last_login_at
  )
  INTO v_admin
  FROM main_admin ma
  WHERE ma.email = p_email;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$$;

-- ============================================================
-- 2. UPDATE MAIN ADMIN LAST LOGIN
-- ============================================================

CREATE OR REPLACE FUNCTION update_main_admin_last_login(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE main_admin SET last_login_at = NOW() WHERE id = p_admin_id;
END;
$$;

-- ============================================================
-- 3. GET MAIN ADMIN BY ID (for token verification)
-- ============================================================

CREATE OR REPLACE FUNCTION get_main_admin_by_id(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ma.id,
    'email', ma.email,
    'name', ma.name,
    'is_active', ma.is_active
  )
  INTO v_admin
  FROM main_admin ma
  WHERE ma.id = p_admin_id;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Main admin not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$$;

-- ============================================================
-- 4. LIST BUYING GROUPS (using admin table)
-- Returns paginated list of admin records as buying groups
-- ============================================================

CREATE OR REPLACE FUNCTION get_buying_groups_list(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_groups JSONB;
  v_stats JSONB;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  -- Stats (using admin table, treating is_active as status, only super_admin role)
  SELECT jsonb_build_object(
    'total', COUNT(*)::INTEGER,
    'active', COUNT(*) FILTER (WHERE a.is_active = true)::INTEGER,
    'inactive', COUNT(*) FILTER (WHERE a.is_active = false)::INTEGER,
    'suspended', 0::INTEGER
  )
  INTO v_stats
  FROM admin a
  WHERE a.role = 'super_admin';

  -- Count
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM admin a
  WHERE
    a.role = 'super_admin'
    AND (p_search IS NULL OR p_search = '' OR
      a.name ILIKE '%' || p_search || '%' OR
      a.email ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
      (p_status = 'active' AND a.is_active = true) OR
      (p_status = 'inactive' AND a.is_active = false));

  -- Fetch (treating admin records as buying groups)
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_groups
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'contactEmail', a.email,
      'contactPhone', a.contact_phone,
      'address', a.address,
      'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
      'notes', a.notes,
      'createdAt', a.created_at,
      'updatedAt', a.updated_at,
      'adminCount', 1,
      'role', a.role,
      'lastLoginAt', a.last_login_at
    ) AS row_data
    FROM admin a
    WHERE
      a.role = 'super_admin'
      AND (p_search IS NULL OR p_search = '' OR
        a.name ILIKE '%' || p_search || '%' OR
        a.email ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
        (p_status = 'active' AND a.is_active = true) OR
        (p_status = 'inactive' AND a.is_active = false))
    ORDER BY
      CASE WHEN p_sort_order = 'desc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'status' THEN a.is_active::TEXT
          WHEN 'created_at' THEN a.created_at::TEXT
          ELSE a.created_at::TEXT
        END
      END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'status' THEN a.is_active::TEXT
          WHEN 'created_at' THEN a.created_at::TEXT
          ELSE a.created_at::TEXT
        END
      END ASC NULLS LAST
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'buyingGroups', v_groups,
    'stats', v_stats,
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
-- 5. GET BUYING GROUP BY ID (using admin table)
-- ============================================================

CREATE OR REPLACE FUNCTION get_buying_group_by_id(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
    'notes', a.notes,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at,
    'role', a.role,
    'lastLoginAt', a.last_login_at
  )
  INTO v_group
  FROM admin a
  WHERE a.id = p_group_id AND a.role = 'super_admin';

  IF v_group IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  -- Return the admin record as both the group and the single admin
  RETURN jsonb_build_object(
    'error', false,
    'buyingGroup', v_group,
    'admins', jsonb_build_array(v_group)
  );
END;
$$;

-- ============================================================
-- 6. CREATE BUYING GROUP (create admin record)
-- Creates an admin user which represents a buying group
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
  v_group JSONB;
  v_email TEXT;
  v_name TEXT;
BEGIN
  -- Use the buying group name (not admin name)
  v_email := COALESCE(p_admin_email, p_contact_email);
  v_name := p_name;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Email is required'
    );
  END IF;

  IF p_admin_password_hash IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Password is required'
    );
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM admin WHERE email = v_email) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Email already exists'
    );
  END IF;

  -- Create admin record (which represents the buying group)
  INSERT INTO admin (email, password_hash, name, role, is_active, permissions)
  VALUES (
    v_email,
    p_admin_password_hash,
    v_name,
    'super_admin',
    true,
    '["dashboard","pharmacies","distributors","marketplace","documents","payments","payout_hub","analytics","settings","admins","processors","policies","ndc_pricing","tbd_items","destruction","warehouse"]'::jsonb
  )
  RETURNING id INTO v_admin_id;

  -- Also set the business_name in admin_settings to the group name
  INSERT INTO admin_settings (id, business_name) 
  VALUES (1, p_name) 
  ON CONFLICT (id) DO UPDATE 
  SET business_name = EXCLUDED.business_name,
      updated_at = NOW();

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', NULL,
    'address', NULL,
    'status', 'active',
    'notes', NULL,
    'createdAt', a.created_at,
    'role', a.role
  )
  INTO v_group
  FROM admin a
  WHERE a.id = v_admin_id;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Buying group created successfully',
    'buyingGroup', v_group,
    'adminId', v_admin_id
  );
END;
$$;

-- ============================================================
-- 7. UPDATE BUYING GROUP (update admin record)
-- ============================================================

CREATE OR REPLACE FUNCTION update_buying_group(
  p_group_id UUID,
  p_name TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group JSONB;
  v_is_active BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_group_id) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  -- Convert status to is_active
  IF p_status IS NOT NULL THEN
    IF p_status = 'active' THEN
      v_is_active := true;
    ELSIF p_status IN ('inactive', 'suspended') THEN
      v_is_active := false;
    ELSE
      RETURN jsonb_build_object('error', true, 'message', 'Invalid status');
    END IF;
  END IF;

  -- Check email uniqueness if updating
  IF p_contact_email IS NOT NULL AND EXISTS (SELECT 1 FROM admin WHERE email = p_contact_email AND id != p_group_id) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Email already exists');
  END IF;

  UPDATE admin
  SET
    name          = COALESCE(p_name, name),
    email         = COALESCE(p_contact_email, email),
    contact_phone = CASE WHEN p_contact_phone IS NOT NULL THEN p_contact_phone ELSE contact_phone END,
    address       = CASE WHEN p_address IS NOT NULL THEN p_address ELSE address END,
    notes         = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    is_active     = COALESCE(v_is_active, is_active),
    updated_at    = NOW()
  WHERE id = p_group_id AND role = 'super_admin';

  -- Also update business_name in admin_settings if name is being updated
  IF p_name IS NOT NULL THEN
    UPDATE admin_settings
    SET business_name = p_name,
        updated_at = NOW()
    WHERE id = 1;
  END IF;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
    'notes', a.notes,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at,
    'role', a.role
  )
  INTO v_group
  FROM admin a
  WHERE a.id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Buying group updated successfully',
    'buyingGroup', v_group
  );
END;
$$;

-- ============================================================
-- 8. DELETE BUYING GROUP (delete admin record)
-- ============================================================

CREATE OR REPLACE FUNCTION delete_buying_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_group_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  -- Delete the admin record (buying group)
  DELETE FROM admin WHERE id = p_group_id AND role = 'super_admin';

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Buying group deleted successfully'
  );
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_main_admin_by_email TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_main_admin_last_login TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_main_admin_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_buying_groups_list TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_buying_group_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION create_buying_group TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_buying_group TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_buying_group TO authenticated, anon, service_role;
