-- Row-Level Security (RLS) Policies for Pharmacy Table
-- Run this script in your Supabase SQL Editor after creating the pharmacy table
-- These policies work with Supabase Auth

-- Enable RLS on pharmacy table
ALTER TABLE pharmacy ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean reinstall)
DROP POLICY IF EXISTS "Allow service role full access" ON pharmacy;
DROP POLICY IF EXISTS "Allow users to read own pharmacy" ON pharmacy;
DROP POLICY IF EXISTS "Allow users to update own pharmacy" ON pharmacy;
DROP POLICY IF EXISTS "Allow users to delete own pharmacy" ON pharmacy;
DROP POLICY IF EXISTS "Allow users to insert own pharmacy" ON pharmacy;

-- Policy 1: Allow service role full access (for backend operations)
-- This allows your backend service to perform all operations using service_role key
-- This is needed for signup where backend creates the pharmacy record
CREATE POLICY "Allow service role full access"
ON pharmacy
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow authenticated users to READ their own pharmacy record
-- Users can only read their own record (where id matches auth.uid())
CREATE POLICY "Allow users to read own pharmacy"
ON pharmacy
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 3: Allow authenticated users to UPDATE their own pharmacy record
-- Users can only update their own record
CREATE POLICY "Allow users to update own pharmacy"
ON pharmacy
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow authenticated users to DELETE their own pharmacy record
-- Users can only delete their own record
CREATE POLICY "Allow users to delete own pharmacy"
ON pharmacy
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Policy 5: Allow authenticated users to INSERT their own pharmacy record
-- This allows users to create their pharmacy profile (though backend handles this)
-- The id must match their auth.uid()
CREATE POLICY "Allow users to insert own pharmacy"
ON pharmacy
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Note: 
-- - All policies use auth.uid() to match the authenticated user's ID
-- - The service_role policy allows your backend to bypass RLS when using service_role key
-- - Backend uses service_role for signup to create both auth user and pharmacy record
-- - Frontend/client uses authenticated role with JWT token for other operations

