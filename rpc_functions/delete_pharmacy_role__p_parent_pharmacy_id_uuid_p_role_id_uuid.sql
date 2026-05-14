-- Function : delete_pharmacy_role
-- Arguments: p_parent_pharmacy_id uuid, p_role_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_pharmacy_role(p_parent_pharmacy_id uuid, p_role_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_pharmacy_role(p_parent_pharmacy_id uuid, p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy_roles WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  DELETE FROM pharmacy_branch_role_assignments WHERE role_id = p_role_id;
  DELETE FROM pharmacy_role_permissions WHERE role_id = p_role_id;
  DELETE FROM pharmacy_roles WHERE id = p_role_id;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('deleted', true));
END;
$function$;
