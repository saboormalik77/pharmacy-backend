-- Function : get_admin_user_by_id
-- Arguments: p_admin_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_user_by_id(p_admin_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_user_by_id(p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    'buyingGroupId', a.buying_group_id,
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
$function$;
