-- ============================================================
-- Admin Users Management RPC Functions
-- Handles CRUD operations for admin users
-- ============================================================
-- Roles: super_admin, manager, reviewer, support
-- Status: active (is_active=true), inactive (is_active=false)
-- ============================================================

-- ============================================================
-- 1. GET ADMIN USERS LIST WITH STATS
-- Returns list of admin users with pagination, search, filters and stats
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_users_list(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10,
  p_search TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
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
  v_admins JSONB;
  v_stats JSONB;
  v_total_admins INTEGER;
  v_active_admins INTEGER;
  v_super_admins INTEGER;
  v_managers INTEGER;
  v_reviewers INTEGER;
  v_support INTEGER;
  v_by_role JSONB;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;
  
  -- ============================================================
  -- STATS: Calculate statistics
  -- ============================================================
  
  -- Total admins
  SELECT COUNT(*)::INTEGER INTO v_total_admins FROM admin;
  
  -- Active admins
  SELECT COUNT(*)::INTEGER INTO v_active_admins FROM admin WHERE is_active = true;
  
  -- Count by role
  SELECT COUNT(*)::INTEGER INTO v_super_admins FROM admin WHERE role = 'super_admin';
  SELECT COUNT(*)::INTEGER INTO v_managers FROM admin WHERE role = 'manager';
  SELECT COUNT(*)::INTEGER INTO v_reviewers FROM admin WHERE role = 'reviewer';
  SELECT COUNT(*)::INTEGER INTO v_support FROM admin WHERE role = 'support';
  
  -- Build role breakdown
  v_by_role := jsonb_build_object(
    'super_admin', v_super_admins,
    'manager', v_managers,
    'reviewer', v_reviewers,
    'support', v_support
  );
  
  v_stats := jsonb_build_object(
    'totalAdmins', v_total_admins,
    'activeAdmins', v_active_admins,
    'inactiveAdmins', v_total_admins - v_active_admins,
    'superAdmins', v_super_admins,
    'managers', v_managers,
    'reviewers', v_reviewers,
    'support', v_support,
    'byRole', v_by_role
  );
  
  -- ============================================================
  -- COUNT: Get total matching records
  -- ============================================================
  
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM admin a
  WHERE 
    -- Search filter
    (p_search IS NULL OR p_search = '' OR
      a.name ILIKE '%' || p_search || '%' OR
      a.email ILIKE '%' || p_search || '%' OR
      a.id::TEXT ILIKE '%' || p_search || '%')
    -- Role filter
    AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR a.role = p_role)
    -- Status filter
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
      (p_status = 'active' AND a.is_active = true) OR
      (p_status = 'inactive' AND a.is_active = false));
  
  -- ============================================================
  -- FETCH: Get admin users with dynamic sorting
  -- ============================================================
  
  SELECT COALESCE(jsonb_agg(admin_row ORDER BY 
    CASE WHEN p_sort_order = 'asc' THEN NULL END,
    CASE WHEN p_sort_order = 'desc' THEN
      CASE p_sort_by
        WHEN 'name' THEN a.name
        WHEN 'email' THEN a.email
        WHEN 'role' THEN a.role
        WHEN 'created_at' THEN a.created_at::TEXT
        WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
        ELSE a.created_at::TEXT
      END
    END DESC NULLS LAST,
    CASE WHEN p_sort_order = 'asc' THEN
      CASE p_sort_by
        WHEN 'name' THEN a.name
        WHEN 'email' THEN a.email
        WHEN 'role' THEN a.role
        WHEN 'created_at' THEN a.created_at::TEXT
        WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
        ELSE a.created_at::TEXT
      END
    END ASC NULLS LAST
  ), '[]'::jsonb)
  INTO v_admins
  FROM (
    SELECT 
      a.id,
      a.email,
      a.name,
      a.role,
      a.is_active,
      CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END AS status,
      a.last_login_at,
      a.created_at,
      a.updated_at
    FROM admin a
    WHERE 
      -- Search filter
      (p_search IS NULL OR p_search = '' OR
        a.name ILIKE '%' || p_search || '%' OR
        a.email ILIKE '%' || p_search || '%' OR
        a.id::TEXT ILIKE '%' || p_search || '%')
      -- Role filter
      AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR a.role = p_role)
      -- Status filter
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
        (p_status = 'active' AND a.is_active = true) OR
        (p_status = 'inactive' AND a.is_active = false))
    ORDER BY
      CASE WHEN p_sort_order = 'desc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'email' THEN a.email
          WHEN 'role' THEN a.role
          WHEN 'created_at' THEN a.created_at::TEXT
          WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
          ELSE a.created_at::TEXT
        END
      END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'email' THEN a.email
          WHEN 'role' THEN a.role
          WHEN 'created_at' THEN a.created_at::TEXT
          WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
          ELSE a.created_at::TEXT
        END
      END ASC NULLS LAST
    LIMIT p_limit
    OFFSET v_offset
  ) a
  CROSS JOIN LATERAL (
    SELECT jsonb_build_object(
      'id', a.id,
      'email', a.email,
      'name', a.name,
      'role', a.role,
      'roleDisplay', CASE a.role
        WHEN 'super_admin' THEN 'Super Admin'
        WHEN 'manager' THEN 'Manager'
        WHEN 'reviewer' THEN 'Reviewer'
        WHEN 'support' THEN 'Support'
        ELSE a.role
      END,
      'isActive', a.is_active,
      'status', a.status,
      'permissions', COALESCE(a.permissions, '[]'::jsonb),
      'lastLoginAt', a.last_login_at,
      'createdAt', a.created_at,
      'updatedAt', a.updated_at
    ) AS admin_row
  ) admin_data;
  
  -- Return result
  RETURN jsonb_build_object(
    'admins', v_admins,
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
-- 2. GET ADMIN USER BY ID
-- Returns detailed admin user information
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_user_by_id(
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', a.id,
    'email', a.email,
    'name', a.name,
    'role', a.role,
    'roleDisplay', CASE a.role
      WHEN 'super_admin' THEN 'Super Admin'
      WHEN 'manager' THEN 'Manager'
      WHEN 'reviewer' THEN 'Reviewer'
      WHEN 'support' THEN 'Support'
      ELSE a.role
    END,
    'isActive', a.is_active,
    'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
    'permissions', COALESCE(a.permissions, '[]'::jsonb),
    'lastLoginAt', a.last_login_at,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at
  )
  INTO v_admin
  FROM admin a
  WHERE a.id = p_admin_id;
  
  IF v_admin IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Admin user not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'admin', v_admin
  );
END;
$$;

-- ============================================================
-- 3. CREATE ADMIN USER
-- Creates a new admin user with hashed password
-- Password hashing is done in the application layer (bcrypt)
-- ============================================================

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION create_admin_user(
  p_email TEXT,
  p_password_hash TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'support',
  p_permissions JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_admin JSONB;
BEGIN
  -- Validate role
  IF p_role NOT IN ('super_admin', 'manager', 'reviewer', 'support') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid role. Must be one of: super_admin, manager, reviewer, support'
    );
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM admin WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Email already exists'
    );
  END IF;
  
  -- Insert new admin
  INSERT INTO admin (email, password_hash, name, role, permissions, is_active, created_at, updated_at)
  VALUES (p_email, p_password_hash, p_name, p_role, COALESCE(p_permissions, '[]'::jsonb), true, NOW(), NOW())
  RETURNING id INTO v_admin_id;
  
  -- Fetch created admin
  SELECT jsonb_build_object(
    'id', a.id,
    'email', a.email,
    'name', a.name,
    'role', a.role,
    'roleDisplay', CASE a.role
      WHEN 'super_admin' THEN 'Super Admin'
      WHEN 'manager' THEN 'Manager'
      WHEN 'reviewer' THEN 'Reviewer'
      WHEN 'support' THEN 'Support'
      ELSE a.role
    END,
    'isActive', a.is_active,
    'status', 'active',
    'permissions', COALESCE(a.permissions, '[]'::jsonb),
    'createdAt', a.created_at
  )
  INTO v_admin
  FROM admin a
  WHERE a.id = v_admin_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Admin user created successfully',
    'admin', v_admin
  );
END;
$$;

-- ============================================================
-- 4. UPDATE ADMIN USER
-- Updates admin user information (not password)
-- ============================================================

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS update_admin_user(UUID, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS update_admin_user(UUID, TEXT, TEXT, TEXT, BOOLEAN, JSONB);

CREATE OR REPLACE FUNCTION update_admin_user(
  p_admin_id UUID,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_permissions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
  v_existing_email TEXT;
BEGIN
  -- Check if admin exists
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_admin_id) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Admin user not found'
    );
  END IF;
  
  -- Validate role if provided
  IF p_role IS NOT NULL AND p_role NOT IN ('super_admin', 'manager', 'reviewer', 'support') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid role. Must be one of: super_admin, manager, reviewer, support'
    );
  END IF;
  
  -- Check email uniqueness if email is being updated
  IF p_email IS NOT NULL THEN
    SELECT email INTO v_existing_email FROM admin WHERE email = p_email AND id != p_admin_id;
    IF v_existing_email IS NOT NULL THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Email already exists'
      );
    END IF;
  END IF;
  
  -- Update admin
  UPDATE admin
  SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    role = COALESCE(p_role, role),
    is_active = COALESCE(p_is_active, is_active),
    permissions = COALESCE(p_permissions, permissions),
    updated_at = NOW()
  WHERE id = p_admin_id;
  
  -- Fetch updated admin
  SELECT jsonb_build_object(
    'id', a.id,
    'email', a.email,
    'name', a.name,
    'role', a.role,
    'roleDisplay', CASE a.role
      WHEN 'super_admin' THEN 'Super Admin'
      WHEN 'manager' THEN 'Manager'
      WHEN 'reviewer' THEN 'Reviewer'
      WHEN 'support' THEN 'Support'
      ELSE a.role
    END,
    'isActive', a.is_active,
    'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
    'permissions', COALESCE(a.permissions, '[]'::jsonb),
    'lastLoginAt', a.last_login_at,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at
  )
  INTO v_admin
  FROM admin a
  WHERE a.id = p_admin_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Admin user updated successfully',
    'admin', v_admin
  );
END;
$$;

-- ============================================================
-- 5. UPDATE ADMIN PASSWORD
-- Updates admin user password (requires password hash from app)
-- ============================================================

CREATE OR REPLACE FUNCTION update_admin_password(
  p_admin_id UUID,
  p_new_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin exists
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_admin_id) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Admin user not found'
    );
  END IF;
  
  -- Update password
  UPDATE admin
  SET
    password_hash = p_new_password_hash,
    updated_at = NOW()
  WHERE id = p_admin_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Password updated successfully'
  );
END;
$$;

-- ============================================================
-- 6. DELETE ADMIN USER
-- Deletes an admin user (prevents deleting last super_admin)
-- ============================================================

CREATE OR REPLACE FUNCTION delete_admin_user(
  p_admin_id UUID,
  p_requesting_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role TEXT;
  v_super_admin_count INTEGER;
BEGIN
  -- Check if admin exists
  SELECT role INTO v_admin_role FROM admin WHERE id = p_admin_id;
  
  IF v_admin_role IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Admin user not found'
    );
  END IF;
  
  -- Prevent self-deletion
  IF p_admin_id = p_requesting_admin_id THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cannot delete your own account'
    );
  END IF;
  
  -- Prevent deleting last super_admin
  IF v_admin_role = 'super_admin' THEN
    SELECT COUNT(*)::INTEGER INTO v_super_admin_count FROM admin WHERE role = 'super_admin';
    IF v_super_admin_count <= 1 THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Cannot delete the last Super Admin'
      );
    END IF;
  END IF;
  
  -- Delete admin
  DELETE FROM admin WHERE id = p_admin_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Admin user deleted successfully'
  );
END;
$$;

-- ============================================================
-- 7. GET ALL ROLES
-- Returns all available admin roles
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_roles()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'roles', jsonb_build_array(
      jsonb_build_object(
        'value', 'super_admin',
        'label', 'Super Admin',
        'description', 'Full system access, manage all users, system configuration',
        'color', 'danger'
      ),
      jsonb_build_object(
        'value', 'manager',
        'label', 'Manager',
        'description', 'Manage pharmacies, approve documents, process payments, view analytics',
        'color', 'warning'
      ),
      jsonb_build_object(
        'value', 'reviewer',
        'label', 'Reviewer',
        'description', 'Review documents, approve/reject returns, view shipments',
        'color', 'info'
      ),
      jsonb_build_object(
        'value', 'support',
        'label', 'Support',
        'description', 'View-only access, customer support, answer queries, generate reports',
        'color', 'default'
      )
    )
  );
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_admin_users_list TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_admin_user_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION create_admin_user TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_admin_user TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_admin_password TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_admin_user TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_admin_roles TO authenticated, anon, service_role;

