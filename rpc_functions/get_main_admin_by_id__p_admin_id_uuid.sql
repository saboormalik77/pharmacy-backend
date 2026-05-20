-- Function : get_main_admin_by_id
-- Arguments: p_admin_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_main_admin_by_id(p_admin_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_main_admin_by_id(p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ma.id,
    'email', ma.email,
    'name', ma.name,
    'is_active', ma.is_active
  )
  INTO v_admin
  FROM main_admin ma
  WHERE ma.id = p_admin_id;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Main admin not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$function$;
