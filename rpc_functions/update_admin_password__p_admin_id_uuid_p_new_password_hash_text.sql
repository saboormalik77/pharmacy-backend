-- Function : update_admin_password
-- Arguments: p_admin_id uuid, p_new_password_hash text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_admin_password(p_admin_id uuid, p_new_password_hash text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_admin_password(p_admin_id uuid, p_new_password_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if admin exists
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_admin_id) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Admin user not found'
    );
  END IF;
  
  -- Update password
  UPDATE admin
  SET
    password_hash = p_new_password_hash,
    updated_at = NOW()
  WHERE id = p_admin_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Password updated successfully'
  );
END;
$function$;
