-- Function : validate_admin_tenant_access
-- Arguments: p_admin_id uuid, p_tenant_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.validate_admin_tenant_access(p_admin_id uuid, p_tenant_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_admin_tenant_access(p_admin_id uuid, p_tenant_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_role TEXT;
  v_admin_bg UUID;
  v_resolved_bg UUID;
BEGIN
  SELECT role, buying_group_id
    INTO v_role, v_admin_bg
  FROM admin
  WHERE id = p_admin_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Admin not found', 'code', 404);
  END IF;

  -- The buying_group_id this admin effectively belongs to
  IF v_role = 'super_admin' THEN
    v_resolved_bg := p_admin_id;
  ELSE
    v_resolved_bg := v_admin_bg;
  END IF;

  -- If a tenant context is present, enforce it
  IF p_tenant_buying_group_id IS NOT NULL THEN
    IF v_resolved_bg IS NULL OR v_resolved_bg <> p_tenant_buying_group_id THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'You do not have access to this portal',
        'code', 403
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'buying_group_id', v_resolved_bg
  );
END;
$function$;
