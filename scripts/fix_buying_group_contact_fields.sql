-- ============================================================
-- Migration: Add contact_phone, address, and notes columns to admin table
-- and update all RPC functions that manage buying groups to persist/return these fields.
-- ============================================================

-- Step 1: Add missing columns to the admin table
ALTER TABLE public.admin
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- Step 2: Update get_buying_groups_list to return actual values
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

  -- Stats
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

  -- Fetch
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
      CASE WHEN p_sort_order != 'desc' THEN
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
-- Step 3: Update get_buying_group_by_id to return actual values
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

  RETURN jsonb_build_object(
    'error', false,
    'buyingGroup', v_group,
    'admins', jsonb_build_array(v_group)
  );
END;
$$;

-- ============================================================
-- Step 4: Update update_buying_group to save all fields
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
  IF p_contact_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM admin WHERE email = p_contact_email AND id != p_group_id
  ) THEN
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
-- Step 5: Re-grant permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION get_buying_groups_list TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_buying_group_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_buying_group TO authenticated, anon, service_role;
