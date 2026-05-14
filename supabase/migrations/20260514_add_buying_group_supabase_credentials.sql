-- ============================================================
-- Migration: Add Supabase credentials to buying groups (admin table)
-- These credentials allow buying groups to connect to their own Supabase instances
-- ============================================================

-- Drop existing functions with old signatures first to avoid ambiguity
DROP FUNCTION IF EXISTS get_buying_groups_list(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_buying_group_by_id(UUID);
DROP FUNCTION IF EXISTS create_buying_group(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_buying_group(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Add new columns to admin table for Supabase credentials
ALTER TABLE admin 
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT,
ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT,
ADD COLUMN IF NOT EXISTS supabase_enabled BOOLEAN DEFAULT false;

-- Update get_buying_groups_list to return Supabase credentials
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
  WHERE a.role = 'super_admin' AND a.buying_group_id = a.id;

  -- Count
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM admin a
  WHERE
    a.role = 'super_admin'
    AND a.buying_group_id = a.id
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
      'adminCount', (
        SELECT COUNT(*)::INTEGER 
        FROM admin a2 
        WHERE a2.buying_group_id = a.id AND a2.role != 'super_admin'
      ),
      'role', a.role,
      'lastLoginAt', a.last_login_at,
      'supabaseUrl', a.supabase_url,
      'supabaseAnonKey', a.supabase_anon_key,
      'supabaseServiceRoleKey', a.supabase_service_role_key,
      'supabaseEnabled', a.supabase_enabled
    ) AS row_data
    FROM admin a
    WHERE
      a.role = 'super_admin'
      AND a.buying_group_id = a.id
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

-- Update get_buying_group_by_id to return Supabase credentials
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
    'status', CASE 
      WHEN a.is_active = true THEN 'active'
      WHEN a.role = 'suspended' THEN 'suspended'
      ELSE 'inactive'
    END,
    'notes', a.notes,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at,
    'role', a.role,
    'lastLoginAt', a.last_login_at,
    'adminCount', (
      SELECT COUNT(*)::INTEGER 
      FROM admin a2 
      WHERE a2.buying_group_id = a.id AND a2.role != 'super_admin'
    ),
    'supabaseUrl', a.supabase_url,
    'supabaseAnonKey', a.supabase_anon_key,
    'supabaseServiceRoleKey', a.supabase_service_role_key,
    'supabaseEnabled', a.supabase_enabled
  )
  INTO v_group
  FROM admin a
  WHERE a.id = p_group_id AND a.role = 'super_admin';

  IF v_group IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'buyingGroup', v_group,
    'admins', jsonb_build_array(v_group)
  );
END;
$$;

-- Update create_buying_group to accept Supabase credentials
CREATE OR REPLACE FUNCTION create_buying_group(
  p_name TEXT,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL,
  p_admin_password_hash TEXT DEFAULT NULL,
  p_admin_name TEXT DEFAULT NULL,
  p_supabase_url TEXT DEFAULT NULL,
  p_supabase_anon_key TEXT DEFAULT NULL,
  p_supabase_service_role_key TEXT DEFAULT NULL,
  p_supabase_enabled BOOLEAN DEFAULT false
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

  IF EXISTS (SELECT 1 FROM admin WHERE email = v_email) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Email already exists'
    );
  END IF;

  INSERT INTO admin (
    email,
    password_hash,
    name,
    role,
    is_active,
    permissions,
    contact_phone,
    address,
    notes,
    buying_group_id,
    supabase_url,
    supabase_anon_key,
    supabase_service_role_key,
    supabase_enabled
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
    p_notes,
    NULL,
    p_supabase_url,
    p_supabase_anon_key,
    p_supabase_service_role_key,
    p_supabase_enabled
  )
  RETURNING id INTO v_admin_id;

  UPDATE admin 
  SET buying_group_id = v_admin_id 
  WHERE id = v_admin_id;

  INSERT INTO admin_settings (
    buying_group_id, 
    business_name,
    created_at, 
    updated_at
  )
  VALUES (
    v_admin_id,
    p_name,
    NOW(),
    NOW()
  );

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', 'active',
    'notes', a.notes,
    'createdAt', a.created_at,
    'role', a.role,
    'supabaseUrl', a.supabase_url,
    'supabaseEnabled', a.supabase_enabled
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

-- Update update_buying_group to accept Supabase credentials
CREATE OR REPLACE FUNCTION update_buying_group(
  p_group_id UUID,
  p_name TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_supabase_url TEXT DEFAULT NULL,
  p_supabase_anon_key TEXT DEFAULT NULL,
  p_supabase_service_role_key TEXT DEFAULT NULL,
  p_supabase_enabled BOOLEAN DEFAULT NULL
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

  IF p_status IS NOT NULL THEN
    IF p_status = 'active' THEN
      v_is_active := true;
    ELSIF p_status IN ('inactive', 'suspended') THEN
      v_is_active := false;
    ELSE
      RETURN jsonb_build_object('error', true, 'message', 'Invalid status');
    END IF;
  END IF;

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
    updated_at    = NOW(),
    supabase_url  = COALESCE(p_supabase_url, supabase_url),
    supabase_anon_key = COALESCE(p_supabase_anon_key, supabase_anon_key),
    supabase_service_role_key = COALESCE(p_supabase_service_role_key, supabase_service_role_key),
    supabase_enabled = COALESCE(p_supabase_enabled, supabase_enabled)
  WHERE id = p_group_id AND role = 'super_admin';

  IF p_name IS NOT NULL THEN
    UPDATE admin_settings
    SET business_name = p_name,
        updated_at = NOW()
    WHERE buying_group_id = p_group_id;
  END IF;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', CASE 
      WHEN a.is_active = true THEN 'active'
      WHEN a.role = 'suspended' THEN 'suspended'
      ELSE 'inactive'
    END,
    'notes', a.notes,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at,
    'role', a.role,
    'supabaseUrl', a.supabase_url,
    'supabaseAnonKey', a.supabase_anon_key,
    'supabaseServiceRoleKey', a.supabase_service_role_key,
    'supabaseEnabled', a.supabase_enabled
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_buying_groups_list TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_buying_group_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION create_buying_group TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_buying_group TO authenticated, anon, service_role;