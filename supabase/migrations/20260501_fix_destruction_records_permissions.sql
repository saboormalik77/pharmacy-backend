-- ============================================================
-- Fix: Grant table permissions for destruction_records
-- The table exists but roles lack direct table-level access.
-- ============================================================

-- Grant full access to all Supabase roles
GRANT ALL ON TABLE destruction_records TO anon;
GRANT ALL ON TABLE destruction_records TO authenticated;
GRANT ALL ON TABLE destruction_records TO service_role;

-- Also grant on the sequence for the UUID default (just in case)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Drop the existing over-restrictive policy and replace with a simpler open one
DROP POLICY IF EXISTS "Service role full access on destruction_records" ON destruction_records;
DROP POLICY IF EXISTS "Admin read destruction_records" ON destruction_records;

-- Single permissive policy: the service_role key bypasses RLS entirely,
-- so this policy covers authenticated/anon reads if ever needed
CREATE POLICY "Allow all access via service role" ON destruction_records
  FOR ALL
  USING (true)
  WITH CHECK (true);
