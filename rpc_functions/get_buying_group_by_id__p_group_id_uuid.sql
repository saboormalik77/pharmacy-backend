-- Function : get_buying_group_by_id
-- Arguments: p_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_buying_group_by_id(p_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_buying_group_by_id(p_group_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_group JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
    'notes', a.notes,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at,
    'role', a.role,
    'lastLoginAt', a.last_login_at
  )
  INTO v_group
  FROM admin a
  WHERE a.id = p_group_id AND a.role = 'super_admin';

  IF v_group IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  -- Return the admin record as both the group and the single admin
  RETURN jsonb_build_object(
    'error', false,
    'buyingGroup', v_group,
    'admins', jsonb_build_array(v_group)
  );
END;
$function$;
