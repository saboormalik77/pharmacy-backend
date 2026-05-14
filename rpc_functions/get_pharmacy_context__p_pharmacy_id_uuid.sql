-- Function : get_pharmacy_context
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_context(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_context(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_pharmacy    RECORD;
  v_is_parent   BOOLEAN;
  v_is_branch   BOOLEAN;
  v_branches    JSONB := '[]'::jsonb;
  v_parent_info JSONB := 'null'::jsonb;
  v_permissions JSONB;
  v_roles       JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_pharmacy FROM pharmacy WHERE id = p_pharmacy_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_is_branch := v_pharmacy.parent_pharmacy_id IS NOT NULL;
  v_is_parent := NOT v_is_branch AND v_pharmacy.can_manage_branches = TRUE;

  IF v_is_parent THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id',           b.id,
      'pharmacyName', b.pharmacy_name,
      'email',        b.email,
      'status',       b.status
    ) ORDER BY b.pharmacy_name), '[]'::jsonb)
    INTO v_branches
    FROM pharmacy b WHERE b.parent_pharmacy_id = p_pharmacy_id;

    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_permissions FROM pharmacy_permissions pp;
  END IF;

  IF v_is_branch THEN
    SELECT jsonb_build_object('id', p.id, 'pharmacyName', p.pharmacy_name, 'email', p.email)
    INTO v_parent_info FROM pharmacy p WHERE p.id = v_pharmacy.parent_pharmacy_id;

    SELECT COALESCE(jsonb_agg(DISTINCT pp.permission_key), '[]'::jsonb)
    INTO v_permissions
    FROM pharmacy_branch_role_assignments bra
    JOIN pharmacy_role_permissions rp ON rp.role_id = bra.role_id
    JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
    WHERE bra.branch_pharmacy_id = p_pharmacy_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'roleId', r.id, 'roleName', r.role_name
    )), '[]'::jsonb)
    INTO v_roles
    FROM pharmacy_branch_role_assignments bra
    JOIN pharmacy_roles r ON r.id = bra.role_id
    WHERE bra.branch_pharmacy_id = p_pharmacy_id;
  END IF;

  IF NOT v_is_parent AND NOT v_is_branch THEN
    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_permissions FROM pharmacy_permissions pp;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId',       v_pharmacy.id,
      'pharmacyName',     v_pharmacy.pharmacy_name,
      'email',            v_pharmacy.email,
      'isParent',         v_is_parent,
      'isBranch',         v_is_branch,
      'canManageBranches', COALESCE(v_pharmacy.can_manage_branches, false),
      'branches',         v_branches,
      'parentPharmacy',   v_parent_info,
      'permissions',      v_permissions,
      'roles',            v_roles
    )
  );
END;
$function$;
