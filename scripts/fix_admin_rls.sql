-- ============================================================
-- FIX ADMIN TABLE RLS POLICIES
-- ============================================================
-- RLS is enabled but might be blocking service_role access
-- This script adds policies to allow proper access
-- ============================================================

-- Option 1: Disable RLS for admin table (simplest solution)
-- The admin table is only accessed by the backend using service_role
ALTER TABLE public.admin DISABLE ROW LEVEL SECURITY;

-- OR Option 2: Add policies for service_role (if you want to keep RLS)
-- Uncomment below if you want to keep RLS enabled:

-- DROP POLICY IF EXISTS "Service role has full access to admin" ON public.admin;
-- CREATE POLICY "Service role has full access to admin" ON public.admin
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- ============================================================
-- VERIFY: Check if admin table has data
-- ============================================================
-- SELECT id, email, name, role, is_active FROM admin;

