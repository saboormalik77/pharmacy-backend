-- ================================================================
-- FIX FOR PROCESSORS ERROR: "Failed to count processors:"
-- ================================================================
-- 
-- ISSUE: The processors table has RLS enabled with a policy that doesn't 
-- specify the role (TO service_role), so it effectively blocks all access.
-- 
-- SOLUTION: Fix the policy to properly grant access to service_role
--
-- ================================================================

-- Drop the existing policy that's missing the role specification
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processors;

-- Create proper RLS policies for processors table
-- Policy 1: Allow service role to do everything (for backend operations)
CREATE POLICY "service_role_all_processors" ON public.processors
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow authenticated admin users to access processors in their buying group
-- This is for future direct access if needed
CREATE POLICY "admin_own_buying_group_processors" ON public.processors
FOR ALL
TO authenticated
USING (
  -- Allow access if no buying group restriction (MainAdmin)
  (buying_group_id IS NULL AND auth.jwt() ->> 'role' = 'super_admin')
  OR
  -- Allow access if processor belongs to the same buying group as the admin
  (buying_group_id = (auth.jwt() ->> 'buying_group_id')::uuid)
)
WITH CHECK (
  -- Allow creating/updating if no buying group restriction (MainAdmin)
  (buying_group_id IS NULL AND auth.jwt() ->> 'role' = 'super_admin')
  OR
  -- Allow creating/updating if processor belongs to the same buying group as the admin
  (buying_group_id = (auth.jwt() ->> 'buying_group_id')::uuid)
);

-- Ensure proper permissions are granted
GRANT ALL ON TABLE public.processors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.processors TO authenticated;

-- ================================================================
-- ALSO FIX OTHER TABLES WITH SIMILAR ISSUES
-- ================================================================

-- Fix processor_store_assignments table if it has the same issue
DROP POLICY IF EXISTS "Allow all access via service role" ON public.processor_store_assignments;

CREATE POLICY "service_role_all_processor_assignments" ON public.processor_store_assignments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions for processor_store_assignments
GRANT ALL ON TABLE public.processor_store_assignments TO service_role;

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
-- ================================================================