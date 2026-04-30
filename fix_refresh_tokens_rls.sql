-- Fix refresh_tokens table RLS policies
-- The table has RLS enabled but no policies, causing all operations to fail

-- Policy to allow service role to do everything (for backend operations)
CREATE POLICY "service_role_all_refresh_tokens" ON public.refresh_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy to allow authenticated users to access only their own tokens
CREATE POLICY "pharmacy_own_refresh_tokens" ON public.refresh_tokens
FOR ALL
TO authenticated
USING (pharmacy_id = auth.uid())
WITH CHECK (pharmacy_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON TABLE public.refresh_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refresh_tokens TO authenticated;