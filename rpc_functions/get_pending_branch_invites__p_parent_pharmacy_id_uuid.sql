-- Function : get_pending_branch_invites
-- Arguments: p_parent_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pending_branch_invites(p_parent_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pending_branch_invites(p_parent_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invites JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',           bi.id,
    'email',        bi.email,
    'pharmacyName', bi.pharmacy_name,
    'contactName',  bi.contact_name,
    'createdAt',    bi.created_at,
    'expiresAt',    bi.expires_at
  ) ORDER BY bi.created_at DESC), '[]'::jsonb)
  INTO v_invites
  FROM pharmacy_branch_invites bi
  WHERE bi.parent_pharmacy_id = p_parent_pharmacy_id
    AND bi.status = 'pending'
    AND bi.expires_at > NOW();

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('invites', v_invites));
END;
$function$;
