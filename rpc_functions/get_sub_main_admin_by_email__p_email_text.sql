-- Function : get_sub_main_admin_by_email
-- Arguments: p_email text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_sub_main_admin_by_email(p_email text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_sub_main_admin_by_email(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'password_hash', s.password_hash,
    'name', s.name,
    'role', s.role,
    'permissions', CASE 
      WHEN jsonb_typeof(s.permissions) = 'array' THEN s.permissions
      ELSE '[]'::jsonb
    END,
    'is_active', s.is_active,
    'last_login_at', s.last_login_at
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.email = p_email;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$function$;
