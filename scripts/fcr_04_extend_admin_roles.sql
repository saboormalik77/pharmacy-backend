-- ============================================================
-- FCR Module 2 — Task 2.3: Extend admin roles
-- Run this in Supabase SQL Editor AFTER fcr_03
-- ============================================================

-- Step 1: Drop existing role constraint
ALTER TABLE admin DROP CONSTRAINT IF EXISTS admin_role_check;

-- Step 2: Add new constraint with FCR roles
ALTER TABLE admin ADD CONSTRAINT admin_role_check
  CHECK (role IN (
    'super_admin', 'manager', 'reviewer', 'support',
    'processor', 'warehouse_staff', 'sales_rep'
  ));

-- Step 3: Update comment
COMMENT ON COLUMN admin.role IS 'Admin role: super_admin, manager, reviewer, support, processor, warehouse_staff, sales_rep';
