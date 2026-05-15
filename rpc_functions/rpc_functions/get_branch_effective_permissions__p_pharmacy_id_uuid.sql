-- Function : get_branch_effective_permissions
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_branch_effective_permissions(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_branch_effective_permissions(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_pharmacy RECORD;
  v_perms    JSONB;
BEGIN
  SELECT id, parent_pharmacy_id, can_manage_branches, status
  INTO v_pharmacy FROM pharmacy WHERE id = p_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  IF v_pharmacy.parent_pharmacy_id IS NULL THEN
    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_perms FROM pharmacy_permissions pp;

    RETURN jsonb_build_object('error', false, 'data', jsonb_build_object(
      'permissions', v_perms, 'isFullAccess', true
    ));
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT pp.permission_key), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy_role_permissions rp ON rp.role_id = bra.role_id
  JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
  WHERE bra.branch_pharmacy_id = p_pharmacy_id;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object(
    'permissions', v_perms, 'isFullAccess', false
  ));
END;
$function$;
