-- Function : verify_branch_invite
-- Arguments: p_token text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.verify_branch_invite(p_token text) CASCADE;

CREATE OR REPLACE FUNCTION public.verify_branch_invite(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite RECORD;
  v_parent_name TEXT;
  v_address JSONB;
BEGIN
  IF p_token IS NULL OR TRIM(p_token) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invite token is required');
  END IF;

  SELECT * INTO v_invite FROM pharmacy_branch_invites WHERE invite_token = TRIM(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Invalid invite link');
  END IF;
  IF v_invite.status = 'completed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'This invite has already been used. Please log in instead.');
  END IF;
  IF v_invite.expires_at < NOW() THEN
    UPDATE pharmacy_branch_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('error', true, 'code', 410, 'message', 'This invite link has expired. Please contact your pharmacy administrator.');
  END IF;

  SELECT pharmacy_name INTO v_parent_name FROM pharmacy WHERE id = v_invite.parent_pharmacy_id;

  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city',   COALESCE(v_invite.city, ''),
    'state',  COALESCE(v_invite.state, ''),
    'zip',    COALESCE(v_invite.zip, '')
  );

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId',          v_invite.id,
      'email',             v_invite.email,
      'pharmacyName',      v_invite.pharmacy_name,
      'parentPharmacyName',v_parent_name,
      'contactName',       v_invite.contact_name,
      'phone',             v_invite.phone,
      'fax',               v_invite.fax,
      'deaNumber',         v_invite.dea_number,
      'physicalAddress',   v_address,
      'serviceType',       v_invite.service_type,
      'wholesaler',        v_invite.wholesaler,
      'wholesalerAccount', v_invite.wholesaler_account,
      'isBranch',          true
    )
  );
END;
$function$;
