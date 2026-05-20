-- Function : validate_sub_admin_invite_token
-- Arguments: p_invite_token text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.validate_sub_admin_invite_token(p_invite_token text) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_sub_admin_invite_token(p_invite_token text)
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
    'name', s.name
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.invite_token = p_invite_token
    AND s.invite_expires_at > NOW()
    AND s.invite_accepted_at IS NULL;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid or expired invite token');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$function$;
