-- Check current admin roles and create some super_admin test data if needed

-- Check current roles in admin table
SELECT 'Current admin roles:' as info;
SELECT role, COUNT(*) as count, array_agg(email) as emails
FROM admin
GROUP BY role
ORDER BY role;

-- If no super_admin roles exist, let's create a test one
-- (You can uncomment the lines below if needed)

/*
INSERT INTO admin (email, password_hash, name, role, is_active, permissions)
VALUES (
  'test-super-admin@example.com',
  '$2a$10$nUp.QSi3vZNDWYPyTPxjz.1eywyR2DOKKi9P7IjFiyUiCowQ9321C', -- password: MainAdmin123!
  'Test Super Admin',
  'super_admin',
  true,
  '["dashboard","pharmacies","distributors","marketplace","documents","payments","payout_hub","analytics","settings","admins","processors","policies","ndc_pricing","tbd_items","destruction","warehouse"]'::jsonb
)
ON CONFLICT (email) DO NOTHING;
*/

-- Check super_admin records after potential insert
SELECT 'Super admin records:' as info;
SELECT id, email, name, role, is_active, created_at
FROM admin
WHERE role = 'super_admin'
ORDER BY created_at;