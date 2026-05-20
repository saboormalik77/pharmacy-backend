-- Function : get_main_admin_by_email
-- Arguments: p_email text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_main_admin_by_email(p_email text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_main_admin_by_email(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ma.id,
    'email', ma.email,
    'password_hash', ma.password_hash,
    'name', ma.name,
    'is_active', ma.is_active,
    'last_login_at', ma.last_login_at
  )
  INTO v_admin
  FROM main_admin ma
  WHERE ma.email = p_email;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$function$;
