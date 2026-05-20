-- Function : resend_sub_admin_invite
-- Arguments: p_admin_id uuid, p_invite_token text, p_invite_expires_at timestamp with time zone
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.resend_sub_admin_invite(p_admin_id uuid, p_invite_token text, p_invite_expires_at timestamp with time zone) CASCADE;

CREATE OR REPLACE FUNCTION public.resend_sub_admin_invite(p_admin_id uuid, p_invite_token text, p_invite_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sub_main_admin WHERE id = p_admin_id AND invite_accepted_at IS NULL) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Sub admin not found or already accepted invite');
  END IF;

  UPDATE sub_main_admin
  SET
    invite_token = p_invite_token,
    invite_expires_at = p_invite_expires_at,
    updated_at = NOW()
  WHERE id = p_admin_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'name', s.name
  )
  INTO v_admin
  FROM sub_main_admin s
  WHERE s.id = p_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Invite resent', 'admin', v_admin);
END;
$function$;
