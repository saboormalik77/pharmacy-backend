-- Debug Main Admin Login Issue
-- Run these queries to check what's happening

-- 1. Check if main_admin table exists and has data
SELECT 'main_admin table check' as step;
SELECT COUNT(*) as total_records FROM public.main_admin;

-- 2. Check if our specific user exists
SELECT 'user existence check' as step;
SELECT id, email, name, is_active, created_at 
FROM public.main_admin 
WHERE email = 'mainadmin@pharmadmin.com';

-- 3. Test the RPC function directly
SELECT 'rpc function test' as step;
SELECT get_main_admin_by_email('mainadmin@pharmadmin.com');

-- 4. Check if the function exists
SELECT 'function existence check' as step;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_main_admin_by_email' 
AND routine_schema = 'public';

-- 5. List all main admin users (to see what's actually in the table)
SELECT 'all users in main_admin' as step;
SELECT id, email, name, is_active, length(password_hash) as hash_length, created_at 
FROM public.main_admin;