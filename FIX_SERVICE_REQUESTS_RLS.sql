-- Fix RLS for service_requests table
-- Run this in your Supabase SQL Editor

-- Add missing RLS policy for service_role
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_requests') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Allow all access via service role" ON service_requests;
        
        -- Create new policy for service_role
        CREATE POLICY "Allow all access via service role" ON service_requests
        FOR ALL USING (true) TO service_role;
        
        RAISE NOTICE 'Fixed RLS policy for service_requests table';
    ELSE
        RAISE NOTICE 'service_requests table does not exist';
    END IF;
END $$;