-- ============================================================
-- Fix Business Name Synchronization Issue
-- Ensures buying group name updates sync to admin_settings business_name
-- ============================================================

-- 1. Ensure admin_settings has business_name column
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS business_name TEXT;

-- 2. Ensure there's a global settings row
INSERT INTO admin_settings (id, buying_group_id, site_name, site_email, timezone, language, email_notifications, document_approval_notif, payment_notif, shipment_notif, created_at, updated_at)
VALUES (1, NULL, 'PharmAdmin', 'admin@pharmadmin.com', 'America/New_York', 'en', true, true, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Create trigger function to auto-sync business name
CREATE OR REPLACE FUNCTION sync_business_name_from_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- When an admin with super_admin role updates their name, sync to admin_settings
  IF NEW.role = 'super_admin' AND OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE admin_settings 
    SET business_name = NEW.name, 
        updated_at = NOW() 
    WHERE buying_group_id IS NULL OR id = 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-sync business name when admin name changes
DROP TRIGGER IF EXISTS sync_business_name_trigger ON admin;
CREATE TRIGGER sync_business_name_trigger
  AFTER UPDATE ON admin
  FOR EACH ROW
  EXECUTE FUNCTION sync_business_name_from_admin();

-- 5. Initialize business_name with current super_admin name if exists
UPDATE admin_settings 
SET business_name = (
  SELECT name FROM admin WHERE role = 'super_admin' LIMIT 1
),
updated_at = NOW()
WHERE (buying_group_id IS NULL OR id = 1) AND business_name IS NULL;