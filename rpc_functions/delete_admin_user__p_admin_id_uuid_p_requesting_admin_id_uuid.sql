-- Function : delete_admin_user
-- Arguments: p_admin_id uuid, p_requesting_admin_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_admin_user(p_admin_id uuid, p_requesting_admin_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_admin_user(p_admin_id uuid, p_requesting_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_role TEXT;
  v_super_admin_count INTEGER;
BEGIN
  -- Check if admin exists
  SELECT role INTO v_admin_role FROM admin WHERE id = p_admin_id;
  
  IF v_admin_role IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Admin user not found'
    );
  END IF;
  
  -- Prevent self-deletion
  IF p_admin_id = p_requesting_admin_id THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cannot delete your own account'
    );
  END IF;
  
  -- Prevent deleting last super_admin
  IF v_admin_role = 'super_admin' THEN
    SELECT COUNT(*)::INTEGER INTO v_super_admin_count FROM admin WHERE role = 'super_admin';
    IF v_super_admin_count <= 1 THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Cannot delete the last Super Admin'
      );
    END IF;
  END IF;
  
  -- Delete admin
  DELETE FROM admin WHERE id = p_admin_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Admin user deleted successfully'
  );
END;
$function$;
