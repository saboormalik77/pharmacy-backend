-- Function : create_admin_user
-- Arguments: p_email text, p_password_hash text, p_name text, p_role text, p_permissions jsonb, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_admin_user(p_email text, p_password_hash text, p_name text, p_role text, p_permissions jsonb, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.create_admin_user(p_email text, p_password_hash text, p_name text, p_role text DEFAULT 'support'::text, p_permissions jsonb DEFAULT '[]'::jsonb, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_id UUID;
  v_admin JSONB;
  v_buying_group_id UUID;
BEGIN
  -- Validate role
  IF p_role NOT IN ('super_admin', 'manager', 'reviewer', 'support') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid role. Must be one of: super_admin, manager, reviewer, support'
    );
  END IF;
  
  IF public.email_is_in_use(LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object(
      'error', true,
      'code', 409,
      'message', 'An account with this email already exists'
    );
  END IF;

  -- Resolve the buying_group_id this new admin belongs to.
  -- - super_admin rows self-reference their own id (set after INSERT)
  -- - sub-admins (manager/reviewer/support) MUST belong to a buying group.
  --   The creator's buying_group_id is passed in as p_buying_group_id.
  IF p_role = 'super_admin' THEN
    v_buying_group_id := NULL; -- will be set to admin.id after insert
  ELSE
    IF p_buying_group_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'buying_group_id is required for sub-admin roles (manager/reviewer/support)'
      );
    END IF;

    -- Validate the buying group exists and is a super_admin row
    IF NOT EXISTS (
      SELECT 1 FROM admin WHERE id = p_buying_group_id AND role = 'super_admin'
    ) THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Invalid buying_group_id: must reference an existing super_admin'
      );
    END IF;

    v_buying_group_id := p_buying_group_id;
  END IF;

  -- Insert new admin
  INSERT INTO admin (
    email, password_hash, name, role, permissions,
    is_active, buying_group_id, created_at, updated_at
  )
  VALUES (
    LOWER(TRIM(p_email)), p_password_hash, p_name, p_role,
    COALESCE(p_permissions, '[]'::jsonb),
    true, v_buying_group_id, NOW(), NOW()
  )
  RETURNING id INTO v_admin_id;

  -- For super_admin rows, buying_group_id self-references their own id
  IF p_role = 'super_admin' THEN
    UPDATE admin SET buying_group_id = v_admin_id WHERE id = v_admin_id;
  END IF;
  
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
    'buyingGroupId', a.buying_group_id,
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
$function$;
