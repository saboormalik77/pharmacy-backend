-- Function : verify_pharmacy_switch_access
-- Arguments: p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.verify_pharmacy_switch_access(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.verify_pharmacy_switch_access(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_branch RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_parent_pharmacy_id AND parent_pharmacy_id IS NULL AND can_manage_branches = TRUE) THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Not a pharmacy admin');
  END IF;

  SELECT id, pharmacy_name, email, status, parent_pharmacy_id
  INTO v_branch FROM pharmacy WHERE id = p_branch_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch pharmacy not found');
  END IF;

  IF v_branch.parent_pharmacy_id != p_parent_pharmacy_id THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'This branch does not belong to your pharmacy');
  END IF;

  IF v_branch.status != 'active' THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Branch pharmacy is not active');
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'branchId',     v_branch.id,
      'pharmacyName', v_branch.pharmacy_name,
      'email',        v_branch.email,
      'status',       v_branch.status
    )
  );
END;
$function$;
