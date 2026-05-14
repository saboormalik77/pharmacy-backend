-- Function : delete_buying_group
-- Arguments: p_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_buying_group(p_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_buying_group(p_group_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_group_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  -- Delete the admin record (buying group)
  DELETE FROM admin WHERE id = p_group_id AND role = 'super_admin';

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Buying group deleted successfully'
  );
END;
$function$;
