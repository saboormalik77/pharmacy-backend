-- Function : admin_request_password_reset
-- Arguments: p_email text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.admin_request_password_reset(p_email text) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_request_password_reset(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_admin_id UUID;
    v_admin_name TEXT;
    v_reset_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Normalize email
    p_email := LOWER(TRIM(p_email));
    
    -- Check if admin exists and is active
    SELECT id, name INTO v_admin_id, v_admin_name
    FROM admin
    WHERE email = p_email AND is_active = TRUE;
    
    -- If admin not found or inactive, return success anyway (security - don't reveal if email exists)
    IF v_admin_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'If an account with this email exists, a password reset link has been sent.'
        );
    END IF;
    
    -- Generate reset token (random 64 char hex string)
    v_reset_token := encode(gen_random_bytes(32), 'hex');
    
    -- Token expires in 1 hour
    v_expires_at := NOW() + INTERVAL '1 hour';
    
    -- Store the reset token
    UPDATE admin
    SET 
        reset_token = v_reset_token,
        reset_token_expires_at = v_expires_at,
        updated_at = NOW()
    WHERE id = v_admin_id;
    
    -- Return token and admin info (for sending email)
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'If an account with this email exists, a password reset link has been sent.',
        'adminId', v_admin_id,
        'adminName', v_admin_name,
        'adminEmail', p_email,
        'resetToken', v_reset_token,
        'expiresAt', v_expires_at
    );
END;
$function$;
