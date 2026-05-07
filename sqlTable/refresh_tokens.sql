-- Custom Refresh Tokens table
-- This table stores long-lived refresh tokens that are independent of Supabase session expiry
-- Allows refresh tokens to remain valid even after Supabase access tokens expire
--
-- IMPORTANT: This script will create the pharmacy table if it doesn't exist first!

-- Step 1: Create pharmacy table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pharmacy (
  id uuid NOT NULL,
  email character varying(255) NOT NULL,
  name character varying(255) NOT NULL,
  pharmacy_name character varying(255) NOT NULL,
  phone character varying(20) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT pharmacy_pkey PRIMARY KEY (id),
  CONSTRAINT pharmacy_email_key UNIQUE (email),
  CONSTRAINT pharmacy_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index on pharmacy email if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_pharmacy_email ON public.pharmacy USING btree (email) TABLESPACE pg_default;

-- Step 2: Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacy(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the refresh token (never store raw tokens)
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ, -- NULL means token is active, set to timestamp when revoked
    user_agent TEXT, -- Optional: track device/browser
    ip_address INET -- Optional: track IP for security
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Index for finding tokens by pharmacy
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_pharmacy_id ON refresh_tokens(pharmacy_id);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend operations)
-- Note: Regular users should NOT have direct access to this table
-- All token operations should go through the backend API

-- Optional: Function to clean up expired tokens (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() 
       OR revoked_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
-- GRANT EXECUTE ON FUNCTION cleanup_expired_refresh_tokens() TO service_role;

-- Comments
COMMENT ON TABLE refresh_tokens IS 'Custom refresh tokens for authentication, independent of Supabase session expiry';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token - never store raw tokens';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Token expiration time (default 30 days from creation)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Timestamp when token was revoked, NULL means active';
