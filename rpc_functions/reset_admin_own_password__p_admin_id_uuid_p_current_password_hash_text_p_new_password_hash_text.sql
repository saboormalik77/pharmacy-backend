-- Function : reset_admin_own_password
-- Arguments: p_admin_id uuid, p_current_password_hash text, p_new_password_hash text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.reset_admin_own_password(p_admin_id uuid, p_current_password_hash text, p_new_password_hash text) CASCADE;

CREATE OR REPLACE FUNCTION public.reset_admin_own_password(p_admin_id uuid, p_current_password_hash text, p_new_password_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_stored_hash TEXT;
BEGIN
  -- Get current password hash
  SELECT password_hash INTO v_stored_hash
  FROM admin
  WHERE id = p_admin_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Admin user not found'
    );
  END IF;
  
  -- Note: bcrypt comparison must be done in application layer
  -- This function expects the application to have already verified the current password
  -- and passes a flag or the verified hash
  
  -- Update password
  UPDATE admin
  SET
    password_hash = p_new_password_hash,
    updated_at = NOW()
  WHERE id = p_admin_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Password reset successfully'
  );
END;
$function$;
