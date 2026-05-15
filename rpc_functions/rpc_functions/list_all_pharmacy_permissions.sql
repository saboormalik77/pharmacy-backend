-- Function : list_all_pharmacy_permissions
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_all_pharmacy_permissions() CASCADE;

CREATE OR REPLACE FUNCTION public.list_all_pharmacy_permissions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_perms JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',            pp.id,
    'permissionKey', pp.permission_key,
    'module',        pp.module,
    'action',        pp.action,
    'displayName',   pp.display_name,
    'description',   pp.description,
    'sortOrder',     pp.sort_order
  ) ORDER BY pp.sort_order), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_permissions pp;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('permissions', v_perms));
END;
$function$;
