-- Function : get_pharmacy_role_detail
-- Arguments: p_parent_pharmacy_id uuid, p_role_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_role_detail(p_parent_pharmacy_id uuid, p_role_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_role_detail(p_parent_pharmacy_id uuid, p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_role  RECORD;
  v_perms JSONB;
  v_branches JSONB;
BEGIN
  SELECT * INTO v_role FROM pharmacy_roles
  WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_role_permissions rp
  JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
  WHERE rp.role_id = p_role_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'branchId',     p.id,
    'pharmacyName', p.pharmacy_name,
    'email',        p.email,
    'status',       p.status
  )), '[]'::jsonb)
  INTO v_branches
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy p ON p.id = bra.branch_pharmacy_id
  WHERE bra.role_id = p_role_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',           v_role.id,
      'roleName',     v_role.role_name,
      'description',  v_role.description,
      'isDefault',    v_role.is_default,
      'permissions',  v_perms,
      'assignedBranches', v_branches,
      'createdAt',    v_role.created_at,
      'updatedAt',    v_role.updated_at
    )
  );
END;
$function$;
