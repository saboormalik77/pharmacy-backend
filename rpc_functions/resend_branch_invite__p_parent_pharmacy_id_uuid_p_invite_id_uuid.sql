-- Function : resend_branch_invite
-- Arguments: p_parent_pharmacy_id uuid, p_invite_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.resend_branch_invite(p_parent_pharmacy_id uuid, p_invite_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.resend_branch_invite(p_parent_pharmacy_id uuid, p_invite_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite RECORD;
  v_new_token TEXT;
BEGIN
  SELECT * INTO v_invite
  FROM pharmacy_branch_invites
  WHERE id = p_invite_id AND parent_pharmacy_id = p_parent_pharmacy_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pending invite not found');
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');

  UPDATE pharmacy_branch_invites
  SET invite_token = v_new_token, expires_at = NOW() + INTERVAL '7 days'
  WHERE id = p_invite_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId',    v_invite.id,
      'inviteToken', v_new_token,
      'email',       v_invite.email,
      'pharmacyName', v_invite.pharmacy_name
    )
  );
END;
$function$;
