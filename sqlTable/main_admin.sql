-- Main Admin Table
-- This table stores super-level admin users for the MainAdmin portal
-- MainAdmin manages buying groups (the current admin portal users)
-- Uses a separate authentication system (same pattern as admin table)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.main_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_main_admin_email ON public.main_admin(email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_main_admin_is_active ON public.main_admin(is_active) TABLESPACE pg_default;

ALTER TABLE public.main_admin ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.main_admin IS 'Super-level admin users for the MainAdmin portal that manages buying groups';
