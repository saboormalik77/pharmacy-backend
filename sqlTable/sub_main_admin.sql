-- Sub Main Admin Table
-- Stores sub-admin users created by the main admin in the MainAdmin portal
-- Each sub-admin has a role ('main_admin' or 'sub_admin') and a JSONB permissions array
-- that controls which sidebar tabs they can access.
-- Invite flow: main admin creates sub-admin → invite email sent → sub-admin sets password
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sub_main_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'sub_admin' CHECK (role IN ('main_admin', 'sub_admin')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  invite_accepted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.main_admin(id) ON DELETE SET NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_sub_main_admin_email ON public.sub_main_admin(email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_is_active ON public.sub_main_admin(is_active) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_invite_token ON public.sub_main_admin(invite_token) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_created_by ON public.sub_main_admin(created_by) TABLESPACE pg_default;

ALTER TABLE public.sub_main_admin ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.sub_main_admin IS 'Sub-admin users for the MainAdmin portal with role-based permissions';
