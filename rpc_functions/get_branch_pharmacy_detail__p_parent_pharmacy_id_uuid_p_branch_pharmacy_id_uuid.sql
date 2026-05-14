-- Function : get_branch_pharmacy_detail
-- Arguments: p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_branch_pharmacy_detail(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_branch_pharmacy_detail(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_branch RECORD;
  v_roles  JSONB;
  v_perms  JSONB;
BEGIN
  SELECT * INTO v_branch FROM pharmacy
  WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch pharmacy not found or does not belong to this parent');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'roleId',      r.id,
    'roleName',    r.role_name,
    'description', r.description
  )), '[]'::jsonb)
  INTO v_roles
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy_roles r ON r.id = bra.role_id
  WHERE bra.branch_pharmacy_id = p_branch_pharmacy_id;

  SELECT COALESCE(jsonb_agg(DISTINCT pp.permission_key ORDER BY pp.permission_key), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy_role_permissions rp ON rp.role_id = bra.role_id
  JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
  WHERE bra.branch_pharmacy_id = p_branch_pharmacy_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',             v_branch.id,
      'email',          v_branch.email,
      'name',           v_branch.name,
      'pharmacyName',   v_branch.pharmacy_name,
      'phone',          v_branch.phone,
      'physicalAddress', v_branch.physical_address,
      'status',         v_branch.status,
      'deaNumber',      v_branch.dea_number,
      'createdAt',      v_branch.created_at,
      'updatedAt',      v_branch.updated_at,
      'assignedRoles',  v_roles,
      'permissions',    v_perms
    )
  );
END;
$function$;
