-- Function : admin_reset_password
-- Arguments: p_token text, p_password_hash text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.admin_reset_password(p_token text, p_password_hash text) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_reset_password(p_token text, p_password_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_admin_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Find admin with this token
    SELECT id, reset_token_expires_at
    INTO v_admin_id, v_expires_at
    FROM admin
    WHERE reset_token = p_token AND is_active = TRUE;
    
    -- Token not found
    IF v_admin_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Invalid or expired reset token'
        );
    END IF;
    
    -- Token expired
    IF v_expires_at < NOW() THEN
        -- Clear the expired token
        UPDATE admin
        SET reset_token = NULL, reset_token_expires_at = NULL, updated_at = NOW()
        WHERE id = v_admin_id;
        
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Reset token has expired. Please request a new password reset.'
        );
    END IF;
    
    -- Update password and clear reset token
    UPDATE admin
    SET 
        password_hash = p_password_hash,
        reset_token = NULL,
        reset_token_expires_at = NULL,
        updated_at = NOW()
    WHERE id = v_admin_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Password has been reset successfully. You can now login with your new password.'
    );
END;
$function$;
