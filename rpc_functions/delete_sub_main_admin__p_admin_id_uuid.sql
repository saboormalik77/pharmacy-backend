-- Function : delete_sub_main_admin
-- Arguments: p_admin_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_sub_main_admin(p_admin_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_sub_main_admin(p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sub_main_admin WHERE id = p_admin_id) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Sub admin not found');
  END IF;

  DELETE FROM sub_main_admin WHERE id = p_admin_id;

  RETURN jsonb_build_object('error', false, 'message', 'Sub admin deleted successfully');
END;
$function$;
