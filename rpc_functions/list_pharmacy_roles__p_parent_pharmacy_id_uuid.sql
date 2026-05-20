-- Function : list_pharmacy_roles
-- Arguments: p_parent_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_pharmacy_roles(p_parent_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.list_pharmacy_roles(p_parent_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_roles  JSONB;
  v_role   RECORD;
  v_result JSONB := '[]'::jsonb;
  v_perms  JSONB;
  v_count  BIGINT;
BEGIN
  FOR v_role IN
    SELECT id, role_name, description, is_default, created_at, updated_at
    FROM pharmacy_roles
    WHERE parent_pharmacy_id = p_parent_pharmacy_id
    ORDER BY created_at ASC
  LOOP
    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_perms
    FROM pharmacy_role_permissions rp
    JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
    WHERE rp.role_id = v_role.id;

    SELECT COUNT(*) INTO v_count
    FROM pharmacy_branch_role_assignments WHERE role_id = v_role.id;

    v_result := v_result || jsonb_build_object(
      'id',              v_role.id,
      'roleName',        v_role.role_name,
      'description',     v_role.description,
      'isDefault',       v_role.is_default,
      'permissions',     v_perms,
      'assignedCount',   v_count,
      'createdAt',       v_role.created_at,
      'updatedAt',       v_role.updated_at
    );
  END LOOP;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('roles', v_result));
END;
$function$;
