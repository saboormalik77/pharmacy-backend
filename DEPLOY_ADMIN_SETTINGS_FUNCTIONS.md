# Deploy Admin Settings Multi-Tenant Functions

## Quick Fix - Manual Deployment Required

The `admin_settings` table already has the `buying_group_id` column, but the updated RPC functions need to be deployed manually.

### Steps:

1. **Go to your Supabase Dashboard** → SQL Editor

2. **Run the following SQL** (copy and paste):

```sql
-- Drop old functions
DROP FUNCTION IF EXISTS get_admin_settings();
DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

-- Create new get_admin_settings function with buying group support
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
    (p_buying_group_id IS NULL AND s.buying_group_id IS NULL)
    OR (p_buying_group_id IS NOT NULL AND s.buying_group_id = p_buying_group_id)
  );
  
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

-- Create update_admin_settings function with buying group support
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
  
  -- Insert or update settings for this buying group using UPSERT
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
  
  -- Handle global settings (MainAdmin) separately
  IF p_buying_group_id IS NULL THEN
    UPDATE admin_settings
    SET
      site_name = COALESCE(p_site_name, site_name),
      site_email = COALESCE(p_site_email, site_email),
      timezone = COALESCE(p_timezone, timezone),
      language = COALESCE(p_language, language),
      email_notifications = COALESCE(p_email_notifications, email_notifications),
      document_approval_notif = COALESCE(p_document_approval_notif, document_approval_notif),
      payment_notif = COALESCE(p_payment_notif, payment_notif),
      shipment_notif = COALESCE(p_shipment_notif, shipment_notif),
      warehouse_name = COALESCE(p_warehouse_name, warehouse_name),
      warehouse_street = COALESCE(p_warehouse_street, warehouse_street),
      warehouse_city = COALESCE(p_warehouse_city, warehouse_city),
      warehouse_state = COALESCE(p_warehouse_state, warehouse_state),
      warehouse_zip = COALESCE(p_warehouse_zip, warehouse_zip),
      warehouse_country = COALESCE(p_warehouse_country, warehouse_country),
      warehouse_phone = COALESCE(p_warehouse_phone, warehouse_phone),
      warehouse_contact_name = COALESCE(p_warehouse_contact_name, warehouse_contact_name),
      business_name = COALESCE(p_business_name, business_name),
      logo_url = COALESCE(p_logo_url, logo_url),
      updated_at = NOW()
    WHERE buying_group_id IS NULL;
    
    IF NOT FOUND THEN
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
      );
    END IF;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_settings(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon, service_role;
```

3. **Fix potential table constraint conflicts** (if needed):

```sql
-- Ensure unique constraint exists for buying group scoping
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_buying_group 
  ON admin_settings(buying_group_id) 
  WHERE buying_group_id IS NOT NULL;
```

4. **Test the deployment** by running in SQL Editor:

```sql
-- Test function works
SELECT get_admin_settings(NULL);
```

## What This Fixes

- ✅ Each buying group gets their own business settings (name, logo, warehouse info)
- ✅ Logo uploads are now scoped per buying group 
- ✅ When buying group A changes their logo, it won't affect buying group B
- ✅ MainAdmin can still have global settings (buying_group_id = NULL)

## After Deployment

The backend code changes are already complete. Once you deploy these functions, the multi-tenancy will work immediately!