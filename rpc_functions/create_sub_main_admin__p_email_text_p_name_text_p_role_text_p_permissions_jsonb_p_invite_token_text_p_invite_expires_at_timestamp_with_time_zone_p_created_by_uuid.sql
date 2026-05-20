-- Function : create_sub_main_admin
-- Arguments: p_email text, p_name text, p_role text, p_permissions jsonb, p_invite_token text, p_invite_expires_at timestamp with time zone, p_created_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_sub_main_admin(p_email text, p_name text, p_role text, p_permissions jsonb, p_invite_token text, p_invite_expires_at timestamp with time zone, p_created_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.create_sub_main_admin(p_email text, p_name text, p_role text DEFAULT 'sub_admin'::text, p_permissions jsonb DEFAULT '[]'::jsonb, p_invite_token text DEFAULT NULL::text, p_invite_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
