-- Function : assign_role_to_branch
-- Arguments: p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid, p_role_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.assign_role_to_branch(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid, p_role_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.assign_role_to_branch(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid, p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy_roles WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch pharmacy not found or does not belong to this parent');
  END IF;

  INSERT INTO pharmacy_branch_role_assignments (branch_pharmacy_id, role_id, assigned_by)
  VALUES (p_branch_pharmacy_id, p_role_id, p_parent_pharmacy_id)
  ON CONFLICT (branch_pharmacy_id, role_id) DO NOTHING;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('assigned', true));
END;
$function$;
