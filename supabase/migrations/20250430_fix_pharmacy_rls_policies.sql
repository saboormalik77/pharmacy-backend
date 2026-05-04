-- Fix RLS policies for pharmacy table to allow updates via service role
-- This migration ensures pharmacies can update their own settings

-- Enable RLS on pharmacy table if not already enabled
ALTER TABLE public.pharmacy ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Pharmacies can view own record" ON public.pharmacy;
DROP POLICY IF EXISTS "Pharmacies can update own record" ON public.pharmacy;
DROP POLICY IF EXISTS "Service role has full access" ON public.pharmacy;

-- Policy: Pharmacies can view their own record
CREATE POLICY "Pharmacies can view own record" 
ON public.pharmacy 
FOR SELECT 
USING (auth.uid() = id);

-- Policy: Pharmacies can update their own record
-- This allows pharmacies to update their settings via authenticated requests
CREATE POLICY "Pharmacies can update own record" 
ON public.pharmacy 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Service role bypasses RLS (this should be default but we make it explicit)
-- Note: The service_role already bypasses RLS by default in Supabase,
-- but we ensure all operations are allowed for the service role
CREATE POLICY "Service role has full access"
ON public.pharmacy
FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR auth.uid() = id
);

-- Ensure the pharmacy table grants proper permissions
GRANT ALL ON public.pharmacy TO service_role;
GRANT SELECT, UPDATE ON public.pharmacy TO authenticated;

-- Add comment for documentation
COMMENT ON POLICY "Pharmacies can update own record" ON public.pharmacy IS 
  'Allows pharmacies to update their own settings including profile information, addresses, and documents';
