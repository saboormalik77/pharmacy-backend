-- ============================================================
-- Fix Processor Warehouse Permission
-- Adds warehouse permission to processors who need wine-cellar access
-- ============================================================

-- Add warehouse permission to the specific user having issues
UPDATE admin 
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["warehouse"]'::jsonb
WHERE email = 'zelie5@museumness.com' 
  AND role = 'processor'
  AND NOT (permissions ? 'warehouse');

-- Add warehouse permission to ALL processors if they don't have it
-- (Uncomment below if you want to apply to all processors)
/*
UPDATE admin 
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["warehouse"]'::jsonb
WHERE role = 'processor'
  AND NOT (permissions ? 'warehouse');
*/

-- Verify the changes
SELECT id, email, name, role, permissions 
FROM admin 
WHERE email = 'zelie5@museumness.com' OR role = 'processor'
ORDER BY role, email;