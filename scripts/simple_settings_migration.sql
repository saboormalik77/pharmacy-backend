-- Simple version of admin_settings multi-tenant migration
-- (Run each section separately in Supabase SQL editor)

-- 1. Remove singleton constraint and add buying_group_id column
ALTER TABLE admin_settings DROP CONSTRAINT IF EXISTS admin_settings_id_check;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS buying_group_id UUID REFERENCES admin(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_admin_settings_buying_group_id ON admin_settings(buying_group_id);

-- 2. Assign existing singleton row to first super_admin (if exists)
UPDATE admin_settings 
SET buying_group_id = (SELECT id FROM admin WHERE role = 'super_admin' ORDER BY created_at ASC LIMIT 1)
WHERE id = 1 AND buying_group_id IS NULL;

-- 3. Create unique constraints per buying group
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_buying_group 
  ON admin_settings(buying_group_id) 
  WHERE buying_group_id IS NOT NULL;

-- 4. Allow one global settings row for MainAdmin
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_global 
  ON admin_settings(id) 
  WHERE buying_group_id IS NULL;