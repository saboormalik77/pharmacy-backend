-- ============================================================
-- Admin Password Reset Functions
-- For handling forgot password flow for admin users
-- ============================================================

-- Add reset token columns to admin table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin' AND column_name = 'reset_token'
    ) THEN
        ALTER TABLE admin ADD COLUMN reset_token TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin' AND column_name = 'reset_token_expires_at'
    ) THEN
        ALTER TABLE admin ADD COLUMN reset_token_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_admin_reset_token ON public.admin(reset_token) WHERE reset_token IS NOT NULL;

-- ============================================================
-- 1. REQUEST PASSWORD RESET
-- Generates and stores a reset token for the admin
-- Returns the token (to be sent via email by the application)
-- ============================================================

DROP FUNCTION IF EXISTS admin_request_password_reset(TEXT);

CREATE OR REPLACE FUNCTION admin_request_password_reset(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION admin_request_password_reset(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_request_password_reset(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_request_password_reset(TEXT) TO anon;

-- ============================================================
-- 2. VERIFY RESET TOKEN
-- Checks if a reset token is valid and not expired
-- ============================================================

DROP FUNCTION IF EXISTS admin_verify_reset_token(TEXT);

CREATE OR REPLACE FUNCTION admin_verify_reset_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION admin_verify_reset_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_reset_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_verify_reset_token(TEXT) TO anon;

-- ============================================================
-- 3. RESET PASSWORD
-- Resets the password using the reset token
-- Expects password_hash to be passed (hashing done in application)
-- ============================================================

DROP FUNCTION IF EXISTS admin_reset_password(TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_reset_password(p_token TEXT, p_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION admin_reset_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_password(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_reset_password(TEXT, TEXT) TO anon;

