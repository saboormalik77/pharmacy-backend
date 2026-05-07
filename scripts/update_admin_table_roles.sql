-- ============================================================
-- UPDATE ADMIN TABLE - Add New Roles
-- ============================================================
-- This script updates the admin table to support additional roles:
-- - super_admin (existing, renamed from 'admin' to 'super_admin')
-- - manager (new)
-- - reviewer (new)
-- - support (new)
-- ============================================================

-- Step 1: Remove existing CHECK constraint FIRST
ALTER TABLE admin DROP CONSTRAINT IF EXISTS admin_role_check;

-- Step 2: Update existing roles to valid new roles BEFORE adding constraint
-- Convert 'admin' to 'super_admin'
UPDATE admin SET role = 'super_admin' WHERE role = 'admin';

-- Convert any other invalid roles to 'support' (safe default)
UPDATE admin SET role = 'support' 
WHERE role NOT IN ('super_admin', 'manager', 'reviewer', 'support');

-- Step 3: Now add new CHECK constraint (all data is valid)
ALTER TABLE admin ADD CONSTRAINT admin_role_check 
  CHECK (role IN ('super_admin', 'manager', 'reviewer', 'support'));

-- Step 4: Add index for role lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_admin_role ON admin(role);

-- Step 5: Update comments
COMMENT ON COLUMN admin.role IS 'Admin role: super_admin (full access), manager (pharmacy/document management), reviewer (document review), support (view-only support)';

-- ============================================================
-- VERIFICATION - Run this to verify the changes
-- ============================================================
-- SELECT 
--   role, 
--   COUNT(*) as count 
-- FROM admin 
-- GROUP BY role 
-- ORDER BY role;

