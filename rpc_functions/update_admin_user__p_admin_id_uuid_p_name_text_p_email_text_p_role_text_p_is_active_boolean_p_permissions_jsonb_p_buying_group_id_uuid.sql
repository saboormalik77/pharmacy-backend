-- Function : update_admin_user
-- Arguments: p_admin_id uuid, p_name text, p_email text, p_role text, p_is_active boolean, p_permissions jsonb, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_admin_user(p_admin_id uuid, p_name text, p_email text, p_role text, p_is_active boolean, p_permissions jsonb, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.update_admin_user(p_admin_id uuid, p_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_permissions jsonb DEFAULT NULL::jsonb, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin JSONB;
  v_current_role TEXT;
  v_effective_role TEXT;
BEGIN
  -- Check if admin exists
  SELECT role INTO v_current_role FROM admin WHERE id = p_admin_id;
  IF v_current_role IS NULL THEN
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
  
  IF p_email IS NOT NULL AND public.email_is_in_use(LOWER(TRIM(p_email)), p_exclude_admin_id => p_admin_id) THEN
    RETURN jsonb_build_object(
      'error', true,
      'code', 409,
      'message', 'An account with this email already exists'
    );
  END IF;

  -- Validate buying_group_id if provided
  v_effective_role := COALESCE(p_role, v_current_role);
  IF p_buying_group_id IS NOT NULL AND v_effective_role <> 'super_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin WHERE id = p_buying_group_id AND role = 'super_admin'
    ) THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Invalid buying_group_id: must reference an existing super_admin'
      );
    END IF;
  END IF;
  
  -- Update admin
  UPDATE admin
  SET
    name = COALESCE(p_name, name),
    email = COALESCE(LOWER(TRIM(p_email)), email),
    role = COALESCE(p_role, role),
    is_active = COALESCE(p_is_active, is_active),
    permissions = COALESCE(p_permissions, permissions),
    buying_group_id = CASE
      -- super_admin rows always self-reference their own id
      WHEN COALESCE(p_role, role) = 'super_admin' THEN id
      -- otherwise, update to the supplied value if provided, else keep existing
      ELSE COALESCE(p_buying_group_id, buying_group_id)
    END,
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
    'buyingGroupId', a.buying_group_id,
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
$function$;
