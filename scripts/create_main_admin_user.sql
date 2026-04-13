-- ============================================================
-- Create Default Main Admin User
-- Run this script to create the first main admin user
-- ============================================================

-- First, make sure the main_admin table exists
CREATE TABLE IF NOT EXISTS public.main_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delete any existing main admin with this email
DELETE FROM public.main_admin WHERE email = 'mainadmin@pharmadmin.com';

-- Create main admin user with default credentials
-- Email: mainadmin@pharmadmin.com
-- Password: MainAdmin123!
INSERT INTO public.main_admin (
  email,
  password_hash,
  name,
  is_active,
  created_at,
  updated_at
) VALUES (
  'mainadmin@pharmadmin.com',
  '$2a$10$nUp.QSi3vZNDWYPyTPxjz.1eywyR2DOKKi9P7IjFiyUiCowQ9321C', -- MainAdmin123!
  'Main Administrator',
  true,
  NOW(),
  NOW()
);

-- Verify the user was created
SELECT 
  id,
  email,
  name,
  is_active,
  created_at
FROM public.main_admin 
WHERE email = 'mainadmin@pharmadmin.com';

-- Also create RPC functions if they don't exist
CREATE OR REPLACE FUNCTION get_main_admin_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ma.id,
    'email', ma.email,
    'password_hash', ma.password_hash,
    'name', ma.name,
    'is_active', ma.is_active,
    'last_login_at', ma.last_login_at
  )
  INTO v_admin
  FROM main_admin ma
  WHERE ma.email = p_email;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'admin', v_admin);
END;
$$;

GRANT EXECUTE ON FUNCTION get_main_admin_by_email TO authenticated, anon, service_role;