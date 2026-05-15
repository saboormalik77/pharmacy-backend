-- Function : admin_verify_reset_token
-- Arguments: p_token text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.admin_verify_reset_token(p_token text) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_verify_reset_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_admin_id UUID;
    v_admin_email TEXT;
    v_admin_name TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Find admin with this token
    SELECT id, email, name, reset_token_expires_at
    INTO v_admin_id, v_admin_email, v_admin_name, v_expires_at
    FROM admin
    WHERE reset_token = p_token AND is_active = TRUE;
    
    -- Token not found
    IF v_admin_id IS NULL THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
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
            'valid', FALSE,
            'message', 'Reset token has expired. Please request a new password reset.'
        );
    END IF;
    
    -- Token is valid
    RETURN jsonb_build_object(
        'valid', TRUE,
        'email', v_admin_email,
        'name', v_admin_name
    );
END;
$function$;
