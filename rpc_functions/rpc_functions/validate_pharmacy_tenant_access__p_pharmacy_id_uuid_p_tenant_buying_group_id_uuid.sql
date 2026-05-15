-- Function : validate_pharmacy_tenant_access
-- Arguments: p_pharmacy_id uuid, p_tenant_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.validate_pharmacy_tenant_access(p_pharmacy_id uuid, p_tenant_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_pharmacy_tenant_access(p_pharmacy_id uuid, p_tenant_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_created_by UUID;
BEGIN
  SELECT created_by
    INTO v_created_by
  FROM pharmacy
  WHERE id = p_pharmacy_id;

  -- NOTE: pharmacy rows are not required to have created_by populated
  -- historically. When no tenant enforcement is required, we still return
  -- whatever value is present (can be NULL).

  IF p_tenant_buying_group_id IS NOT NULL THEN
    IF v_created_by IS NULL OR v_created_by <> p_tenant_buying_group_id THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'You do not have access to this portal',
        'code', 403
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'buying_group_id', v_created_by
  );
END;
$function$;
