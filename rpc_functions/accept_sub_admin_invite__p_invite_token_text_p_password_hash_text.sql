-- Function : accept_sub_admin_invite
-- Arguments: p_invite_token text, p_password_hash text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.accept_sub_admin_invite(p_invite_token text, p_password_hash text) CASCADE;

CREATE OR REPLACE FUNCTION public.accept_sub_admin_invite(p_invite_token text, p_password_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin JSONB;
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id
  FROM sub_main_admin
  WHERE invite_token = p_invite_token
    AND invite_expires_at > NOW()
    AND invite_accepted_at IS NULL;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid or expired invite token');
  END IF;

  UPDATE sub_main_admin
  SET
    password_hash = p_password_hash,
    invite_accepted_at = NOW(),
    invite_token = NULL,
    updated_at = NOW()
  WHERE id = v_admin_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name,
    'role', s.role
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.id = v_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Account setup complete', 'admin', v_admin);
END;
$function$;
