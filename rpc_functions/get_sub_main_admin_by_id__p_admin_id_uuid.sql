-- Function : get_sub_main_admin_by_id
-- Arguments: p_admin_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_sub_main_admin_by_id(p_admin_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_sub_main_admin_by_id(p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
