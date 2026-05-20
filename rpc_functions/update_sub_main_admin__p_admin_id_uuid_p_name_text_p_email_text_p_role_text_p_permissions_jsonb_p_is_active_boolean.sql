-- Function : update_sub_main_admin
-- Arguments: p_admin_id uuid, p_name text, p_email text, p_role text, p_permissions jsonb, p_is_active boolean
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_sub_main_admin(p_admin_id uuid, p_name text, p_email text, p_role text, p_permissions jsonb, p_is_active boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.update_sub_main_admin(p_admin_id uuid, p_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_permissions jsonb DEFAULT NULL::jsonb, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
