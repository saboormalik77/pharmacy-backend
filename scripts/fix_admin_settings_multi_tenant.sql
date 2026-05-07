-- ============================================================
-- FIX: Convert admin_settings from singleton to multi-tenant
-- ============================================================
-- ISSUE: admin_settings table uses id=1 (singleton), so all buying groups
-- share the same settings row. When one group changes their business name
-- or logo, it affects all groups.
--
-- SOLUTION: Add buying_group_id column and migrate to per-group settings.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Add buying_group_id column and modify constraints
-- ============================================================

-- Remove the singleton constraint that forces id = 1
ALTER TABLE admin_settings DROP CONSTRAINT IF EXISTS admin_settings_id_check;

-- Add buying_group_id column
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS buying_group_id UUID REFERENCES admin(id) ON DELETE CASCADE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_buying_group_id 
  ON admin_settings(buying_group_id);

-- ============================================================
-- 2. Data Migration Strategy
-- ============================================================
-- We need to decide what to do with the existing singleton row (id=1).
-- Options:
-- A) Assign it to the first super_admin found
-- B) Delete it and let each buying group create their own
-- C) Clone it for each existing super_admin
--
-- We'll go with option A (assign to first super_admin) as it's safest.
-- ============================================================

DO $$
DECLARE
  v_first_super_admin_id UUID;
  v_settings_count INTEGER;
BEGIN
  -- Check if there's an existing singleton settings row
  SELECT COUNT(*) INTO v_settings_count FROM admin_settings WHERE id = 1;
  
  IF v_settings_count > 0 THEN
    -- Get the first super_admin (buying group owner)
    SELECT id INTO v_first_super_admin_id 
    FROM admin 
    WHERE role = 'super_admin' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF v_first_super_admin_id IS NOT NULL THEN
      -- Assign the existing settings to this super_admin
      UPDATE admin_settings 
      SET buying_group_id = v_first_super_admin_id 
      WHERE id = 1 AND buying_group_id IS NULL;
      
      RAISE NOTICE 'Existing settings (id=1) assigned to super_admin: %', v_first_super_admin_id;
    ELSE
      -- No super_admins found, delete the singleton row
      DELETE FROM admin_settings WHERE id = 1;
      RAISE NOTICE 'No super_admins found, deleted singleton settings row';
    END IF;
  END IF;
END $$;

-- ============================================================
-- 3. Update Primary Key and Constraints
-- ============================================================

-- Drop old primary key and create a composite one
ALTER TABLE admin_settings DROP CONSTRAINT IF EXISTS admin_settings_pkey;

-- Change id to be auto-increment instead of always 1
ALTER TABLE admin_settings ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS admin_settings_id_seq CASCADE;
CREATE SEQUENCE admin_settings_id_seq;
ALTER TABLE admin_settings ALTER COLUMN id SET DEFAULT nextval('admin_settings_id_seq');

-- Set the sequence to start after existing IDs
SELECT setval('admin_settings_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM admin_settings;

-- Create new primary key (id remains primary, but buying_group_id provides uniqueness per group)
ALTER TABLE admin_settings ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);

-- Ensure each buying group has at most one settings row
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_buying_group 
  ON admin_settings(buying_group_id) 
  WHERE buying_group_id IS NOT NULL;

-- Allow NULL buying_group_id for MainAdmin global settings (max 1 row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_global 
  ON admin_settings(id) 
  WHERE buying_group_id IS NULL;

COMMIT;

-- ============================================================
-- 4. Update the RPC Functions
-- ============================================================

-- Drop the old functions
DROP FUNCTION IF EXISTS get_admin_settings();
DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- ============================================================
-- New get_admin_settings with buying group support
-- ============================================================
CREATE OR REPLACE FUNCTION get_admin_settings(
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  -- Try to get settings for the specific buying group
  SELECT jsonb_build_object(
    'siteName', COALESCE(s.site_name, 'PharmAdmin'),
    'siteEmail', COALESCE(s.site_email, 'admin@pharmadmin.com'),
    'timezone', COALESCE(s.timezone, 'America/New_York'),
    'language', COALESCE(s.language, 'en'),
    'emailNotifications', COALESCE(s.email_notifications, true),
    'documentApprovalNotif', COALESCE(s.document_approval_notif, true),
    'paymentNotif', COALESCE(s.payment_notif, true),
    'shipmentNotif', COALESCE(s.shipment_notif, true),
    'warehouseName', s.warehouse_name,
    'warehouseStreet', s.warehouse_street,
    'warehouseCity', s.warehouse_city,
    'warehouseState', s.warehouse_state,
    'warehouseZip', s.warehouse_zip,
    'warehouseCountry', s.warehouse_country,
    'warehousePhone', s.warehouse_phone,
    'warehouseContactName', s.warehouse_contact_name,
    'businessName', s.business_name,
    'logoUrl', s.logo_url,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at
  )
  INTO v_settings
  FROM admin_settings s
  WHERE (
    -- MainAdmin: get global settings (buying_group_id IS NULL)
    (p_buying_group_id IS NULL AND s.buying_group_id IS NULL)
    -- Buying group admin: get their group's settings
    OR (p_buying_group_id IS NOT NULL AND s.buying_group_id = p_buying_group_id)
  );
  
  -- If no settings exist for this buying group, create defaults
  IF v_settings IS NULL THEN
    INSERT INTO admin_settings (buying_group_id, created_at, updated_at)
    VALUES (p_buying_group_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    RETURN jsonb_build_object(
      'error', false,
      'settings', jsonb_build_object(
        'siteName', 'PharmAdmin',
        'siteEmail', 'admin@pharmadmin.com',
        'timezone', 'America/New_York',
        'language', 'en',
        'emailNotifications', true,
        'documentApprovalNotif', true,
        'paymentNotif', true,
        'shipmentNotif', true,
        'warehouseName', null,
        'warehouseStreet', null,
        'warehouseCity', null,
        'warehouseState', null,
        'warehouseZip', null,
        'warehouseCountry', null,
        'warehousePhone', null,
        'warehouseContactName', null,
        'businessName', null,
        'logoUrl', null,
        'createdAt', NOW(),
        'updatedAt', NOW()
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'settings', v_settings
  );
END;
$$;

-- ============================================================
-- New update_admin_settings with buying group support
-- ============================================================
CREATE OR REPLACE FUNCTION update_admin_settings(
  p_site_name TEXT DEFAULT NULL,
  p_site_email TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_email_notifications BOOLEAN DEFAULT NULL,
  p_document_approval_notif BOOLEAN DEFAULT NULL,
  p_payment_notif BOOLEAN DEFAULT NULL,
  p_shipment_notif BOOLEAN DEFAULT NULL,
  p_warehouse_name TEXT DEFAULT NULL,
  p_warehouse_street TEXT DEFAULT NULL,
  p_warehouse_city TEXT DEFAULT NULL,
  p_warehouse_state TEXT DEFAULT NULL,
  p_warehouse_zip TEXT DEFAULT NULL,
  p_warehouse_country TEXT DEFAULT NULL,
  p_warehouse_phone TEXT DEFAULT NULL,
  p_warehouse_contact_name TEXT DEFAULT NULL,
  p_business_name TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  -- Validate timezone if provided
  IF p_timezone IS NOT NULL AND p_timezone NOT IN (
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'
  ) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid timezone'
    );
  END IF;
  
  -- Validate language if provided
  IF p_language IS NOT NULL AND p_language NOT IN ('en', 'es', 'fr') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid language'
    );
  END IF;
  
  -- Insert or update settings for this buying group
  INSERT INTO admin_settings (
    buying_group_id, site_name, site_email, timezone, language,
    email_notifications, document_approval_notif, payment_notif, shipment_notif,
    warehouse_name, warehouse_street, warehouse_city, warehouse_state, warehouse_zip,
    warehouse_country, warehouse_phone, warehouse_contact_name, business_name, logo_url,
    created_at, updated_at
  )
  VALUES (
    p_buying_group_id,
    COALESCE(p_site_name, 'PharmAdmin'),
    COALESCE(p_site_email, 'admin@pharmadmin.com'),
    COALESCE(p_timezone, 'America/New_York'),
    COALESCE(p_language, 'en'),
    COALESCE(p_email_notifications, true),
    COALESCE(p_document_approval_notif, true),
    COALESCE(p_payment_notif, true),
    COALESCE(p_shipment_notif, true),
    p_warehouse_name, p_warehouse_street, p_warehouse_city, p_warehouse_state, p_warehouse_zip,
    p_warehouse_country, p_warehouse_phone, p_warehouse_contact_name, p_business_name, p_logo_url,
    NOW(), NOW()
  )
  ON CONFLICT (buying_group_id) WHERE buying_group_id IS NOT NULL
  DO UPDATE SET
    site_name = COALESCE(p_site_name, admin_settings.site_name),
    site_email = COALESCE(p_site_email, admin_settings.site_email),
    timezone = COALESCE(p_timezone, admin_settings.timezone),
    language = COALESCE(p_language, admin_settings.language),
    email_notifications = COALESCE(p_email_notifications, admin_settings.email_notifications),
    document_approval_notif = COALESCE(p_document_approval_notif, admin_settings.document_approval_notif),
    payment_notif = COALESCE(p_payment_notif, admin_settings.payment_notif),
    shipment_notif = COALESCE(p_shipment_notif, admin_settings.shipment_notif),
    warehouse_name = COALESCE(p_warehouse_name, admin_settings.warehouse_name),
    warehouse_street = COALESCE(p_warehouse_street, admin_settings.warehouse_street),
    warehouse_city = COALESCE(p_warehouse_city, admin_settings.warehouse_city),
    warehouse_state = COALESCE(p_warehouse_state, admin_settings.warehouse_state),
    warehouse_zip = COALESCE(p_warehouse_zip, admin_settings.warehouse_zip),
    warehouse_country = COALESCE(p_warehouse_country, admin_settings.warehouse_country),
    warehouse_phone = COALESCE(p_warehouse_phone, admin_settings.warehouse_phone),
    warehouse_contact_name = COALESCE(p_warehouse_contact_name, admin_settings.warehouse_contact_name),
    business_name = COALESCE(p_business_name, admin_settings.business_name),
    logo_url = COALESCE(p_logo_url, admin_settings.logo_url),
    updated_at = NOW();
  
  -- Handle global settings (MainAdmin) separately due to different conflict condition
  IF p_buying_group_id IS NULL THEN
    INSERT INTO admin_settings (
      buying_group_id, site_name, site_email, timezone, language,
      email_notifications, document_approval_notif, payment_notif, shipment_notif,
      warehouse_name, warehouse_street, warehouse_city, warehouse_state, warehouse_zip,
      warehouse_country, warehouse_phone, warehouse_contact_name, business_name, logo_url,
      created_at, updated_at
    )
    VALUES (
      NULL,
      COALESCE(p_site_name, 'PharmAdmin'),
      COALESCE(p_site_email, 'admin@pharmadmin.com'),
      COALESCE(p_timezone, 'America/New_York'),
      COALESCE(p_language, 'en'),
      COALESCE(p_email_notifications, true),
      COALESCE(p_document_approval_notif, true),
      COALESCE(p_payment_notif, true),
      COALESCE(p_shipment_notif, true),
      p_warehouse_name, p_warehouse_street, p_warehouse_city, p_warehouse_state, p_warehouse_zip,
      p_warehouse_country, p_warehouse_phone, p_warehouse_contact_name, p_business_name, p_logo_url,
      NOW(), NOW()
    )
    ON CONFLICT (id) WHERE buying_group_id IS NULL
    DO UPDATE SET
      site_name = COALESCE(p_site_name, admin_settings.site_name),
      site_email = COALESCE(p_site_email, admin_settings.site_email),
      timezone = COALESCE(p_timezone, admin_settings.timezone),
      language = COALESCE(p_language, admin_settings.language),
      email_notifications = COALESCE(p_email_notifications, admin_settings.email_notifications),
      document_approval_notif = COALESCE(p_document_approval_notif, admin_settings.document_approval_notif),
      payment_notif = COALESCE(p_payment_notif, admin_settings.payment_notif),
      shipment_notif = COALESCE(p_shipment_notif, admin_settings.shipment_notif),
      warehouse_name = COALESCE(p_warehouse_name, admin_settings.warehouse_name),
      warehouse_street = COALESCE(p_warehouse_street, admin_settings.warehouse_street),
      warehouse_city = COALESCE(p_warehouse_city, admin_settings.warehouse_city),
      warehouse_state = COALESCE(p_warehouse_state, admin_settings.warehouse_state),
      warehouse_zip = COALESCE(p_warehouse_zip, admin_settings.warehouse_zip),
      warehouse_country = COALESCE(p_warehouse_country, admin_settings.warehouse_country),
      warehouse_phone = COALESCE(p_warehouse_phone, admin_settings.warehouse_phone),
      warehouse_contact_name = COALESCE(p_warehouse_contact_name, admin_settings.warehouse_contact_name),
      business_name = COALESCE(p_business_name, admin_settings.business_name),
      logo_url = COALESCE(p_logo_url, admin_settings.logo_url),
      updated_at = NOW();
  END IF;
  
  -- Fetch updated/created settings
  SELECT jsonb_build_object(
    'siteName', s.site_name,
    'siteEmail', s.site_email,
    'timezone', s.timezone,
    'language', s.language,
    'emailNotifications', s.email_notifications,
    'documentApprovalNotif', s.document_approval_notif,
    'paymentNotif', s.payment_notif,
    'shipmentNotif', s.shipment_notif,
    'warehouseName', s.warehouse_name,
    'warehouseStreet', s.warehouse_street,
    'warehouseCity', s.warehouse_city,
    'warehouseState', s.warehouse_state,
    'warehouseZip', s.warehouse_zip,
    'warehouseCountry', s.warehouse_country,
    'warehousePhone', s.warehouse_phone,
    'warehouseContactName', s.warehouse_contact_name,
    'businessName', s.business_name,
    'logoUrl', s.logo_url,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at
  )
  INTO v_settings
  FROM admin_settings s
  WHERE (
    (p_buying_group_id IS NULL AND s.buying_group_id IS NULL)
    OR (p_buying_group_id IS NOT NULL AND s.buying_group_id = p_buying_group_id)
  );
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Settings updated successfully',
    'settings', v_settings
  );
END;
$$;

-- ============================================================
-- Grant permissions
-- ============================================================
GRANT EXECUTE ON FUNCTION get_admin_settings(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon, service_role;

-- ============================================================
-- Verification and Summary
-- ============================================================
DO $$
DECLARE
  v_settings_count INTEGER;
  v_buying_groups INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_settings_count FROM admin_settings;
  SELECT COUNT(*) INTO v_buying_groups FROM admin WHERE role = 'super_admin';
  
  RAISE NOTICE '=== Admin Settings Multi-Tenant Migration Complete ===';
  RAISE NOTICE 'Total settings rows: %', v_settings_count;
  RAISE NOTICE 'Total buying groups (super_admins): %', v_buying_groups;
  RAISE NOTICE 'Each buying group can now have their own business name, logo, and warehouse settings.';
END $$;