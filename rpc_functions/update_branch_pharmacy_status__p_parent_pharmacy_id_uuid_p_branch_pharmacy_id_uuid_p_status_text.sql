-- Function : update_branch_pharmacy_status
-- Arguments: p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid, p_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_branch_pharmacy_status(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid, p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_branch_pharmacy_status(p_parent_pharmacy_id uuid, p_branch_pharmacy_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_status NOT IN ('active', 'suspended') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Status must be active or suspended');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pharmacy
    WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id
  ) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch not found or does not belong to this parent');
  END IF;

  UPDATE pharmacy SET status = p_status, updated_at = NOW()
  WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object('branchId', p_branch_pharmacy_id, 'status', p_status)
  );
END;
$function$;
