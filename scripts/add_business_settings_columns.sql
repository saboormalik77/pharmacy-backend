-- ============================================================
-- Add business_name and logo_url columns to admin_settings
-- Also creates the 'settings' storage bucket for logo uploads
-- ============================================================

-- Create 'settings' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings', 'settings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to settings bucket
CREATE POLICY "Public read access on settings bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'settings');

-- Allow service role to upload to settings bucket
CREATE POLICY "Service role upload on settings bucket" ON storage.objects
  FOR INSERT TO service_role WITH CHECK (bucket_id = 'settings');

-- Allow service role to update in settings bucket
CREATE POLICY "Service role update on settings bucket" ON storage.objects
  FOR UPDATE TO service_role USING (bucket_id = 'settings');

-- Allow service role to delete from settings bucket
CREATE POLICY "Service role delete on settings bucket" ON storage.objects
  FOR DELETE TO service_role USING (bucket_id = 'settings');

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url      TEXT DEFAULT NULL;

-- ============================================================
-- Update get_admin_settings to include new fields
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
BEGIN
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
  WHERE s.id = 1;

  IF v_settings IS NULL THEN
    INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

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
-- Update update_admin_settings to include new fields
-- ============================================================

CREATE OR REPLACE FUNCTION update_admin_settings(
  p_site_name               TEXT    DEFAULT NULL,
  p_site_email              TEXT    DEFAULT NULL,
  p_timezone                TEXT    DEFAULT NULL,
  p_language                TEXT    DEFAULT NULL,
  p_email_notifications     BOOLEAN DEFAULT NULL,
  p_document_approval_notif BOOLEAN DEFAULT NULL,
  p_payment_notif           BOOLEAN DEFAULT NULL,
  p_shipment_notif          BOOLEAN DEFAULT NULL,
  p_warehouse_name          TEXT    DEFAULT NULL,
  p_warehouse_street        TEXT    DEFAULT NULL,
  p_warehouse_city          TEXT    DEFAULT NULL,
  p_warehouse_state         TEXT    DEFAULT NULL,
  p_warehouse_zip           TEXT    DEFAULT NULL,
  p_warehouse_country       TEXT    DEFAULT NULL,
  p_warehouse_phone         TEXT    DEFAULT NULL,
  p_warehouse_contact_name  TEXT    DEFAULT NULL,
  p_business_name           TEXT    DEFAULT NULL,
  p_logo_url                TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  IF p_timezone IS NOT NULL AND p_timezone NOT IN (
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'
  ) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid timezone. Supported: America/New_York, America/Chicago, America/Denver, America/Los_Angeles, America/Phoenix, America/Anchorage, Pacific/Honolulu, UTC'
    );
  END IF;

  IF p_language IS NOT NULL AND p_language NOT IN ('en', 'es', 'fr') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid language. Supported: en, es, fr'
    );
  END IF;

  INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

  UPDATE admin_settings
  SET
    site_name               = COALESCE(p_site_name, site_name),
    site_email              = COALESCE(p_site_email, site_email),
    timezone                = COALESCE(p_timezone, timezone),
    language                = COALESCE(p_language, language),
    email_notifications     = COALESCE(p_email_notifications, email_notifications),
    document_approval_notif = COALESCE(p_document_approval_notif, document_approval_notif),
    payment_notif           = COALESCE(p_payment_notif, payment_notif),
    shipment_notif          = COALESCE(p_shipment_notif, shipment_notif),
    warehouse_name          = COALESCE(p_warehouse_name, warehouse_name),
    warehouse_street        = COALESCE(p_warehouse_street, warehouse_street),
    warehouse_city          = COALESCE(p_warehouse_city, warehouse_city),
    warehouse_state         = COALESCE(p_warehouse_state, warehouse_state),
    warehouse_zip           = COALESCE(p_warehouse_zip, warehouse_zip),
    warehouse_country       = COALESCE(p_warehouse_country, warehouse_country),
    warehouse_phone         = COALESCE(p_warehouse_phone, warehouse_phone),
    warehouse_contact_name  = COALESCE(p_warehouse_contact_name, warehouse_contact_name),
    business_name           = COALESCE(p_business_name, business_name),
    logo_url                = COALESCE(p_logo_url, logo_url),
    updated_at              = NOW()
  WHERE id = 1;

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
  WHERE s.id = 1;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Settings updated successfully',
    'settings', v_settings
  );
END;
$$;
