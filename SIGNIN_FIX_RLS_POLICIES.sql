-- ================================================================
-- FIX FOR SIGNIN ERROR: "Failed to create session"
-- ================================================================
-- 
-- ISSUE: The refresh_tokens table has RLS enabled but no policies defined,
-- which blocks all operations including service_role operations.
-- 
-- SOLUTION: Add proper RLS policies to allow:
-- 1. Service role (backend) to perform all operations
-- 2. Authenticated users to access only their own tokens
--
-- ================================================================

-- Drop existing policies if they exist (in case of re-run)
DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "pharmacy_own_refresh_tokens" ON public.refresh_tokens;

-- Policy 1: Allow service role to do everything (for backend operations)
-- This is critical for the signin process to work
CREATE POLICY "service_role_all_refresh_tokens" ON public.refresh_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow authenticated users to access only their own tokens
-- This allows future direct API access if needed
CREATE POLICY "pharmacy_own_refresh_tokens" ON public.refresh_tokens
FOR ALL
TO authenticated
USING (pharmacy_id = auth.uid())
WITH CHECK (pharmacy_id = auth.uid());

-- Ensure proper permissions are granted
GRANT ALL ON TABLE public.refresh_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refresh_tokens TO authenticated;

-- ================================================================
-- VERIFICATION QUERIES (optional - run these to verify the fix)
-- ================================================================

-- Check RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'refresh_tokens';

-- Check policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies 
-- WHERE tablename = 'refresh_tokens';

-- ================================================================
-- HOW TO APPLY THIS FIX:
-- ================================================================
--
-- OPTION 1: Supabase Dashboard (Recommended)
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
--
-- OPTION 2: psql command line
-- psql -h [your-supabase-host] -U postgres -d postgres -f SIGNIN_FIX_RLS_POLICIES.sql
--
-- ================================================================