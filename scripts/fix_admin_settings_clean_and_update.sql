-- ============================================================
-- FIX: Clean up all update_admin_settings function versions and recreate
-- ============================================================

-- First, let's see what versions exist
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_admin_settings'
  AND n.nspname = 'public';

-- Drop ALL possible versions of update_admin_settings function
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop by specific signature (most common versions)
    BEGIN
        DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors
    END;
    
    -- Try to drop any remaining versions by iterating through all matches
    FOR func_record IN 
        SELECT p.oid::regprocedure as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'update_admin_settings'
          AND n.nspname = 'public'
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION ' || func_record.func_signature;
            RAISE NOTICE 'Dropped function: %', func_record.func_signature;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop function: %', func_record.func_signature;
        END;
    END LOOP;
END $$;

-- Verify all versions are gone
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_admin_settings'
  AND n.nspname = 'public';

-- Now create the fixed version
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
  v_affected_rows INTEGER;
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
  
  -- Handle MainAdmin (global settings) separately
  IF p_buying_group_id IS NULL THEN
    -- Try to update existing global settings first
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
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    -- If no global settings row exists, create one
    IF v_affected_rows = 0 THEN
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
    
  ELSE
    -- Handle buying group settings with UPSERT
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
    ON CONFLICT (buying_group_id) 
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
  
  -- Fetch the updated/created settings
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
GRANT EXECUTE ON FUNCTION update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon, service_role;

-- Test the fix by running a harmless update for MainAdmin
SELECT update_admin_settings(
  p_site_name := 'Test MainAdmin Update - Fixed',
  p_buying_group_id := NULL  -- MainAdmin update
);

-- Verify that buying group settings are still intact
SELECT 
  buying_group_id,
  site_name,
  business_name,
  created_at
FROM admin_settings 
ORDER BY 
  CASE WHEN buying_group_id IS NULL THEN 0 ELSE 1 END,
  created_at;

-- Confirm we now have exactly one version of the function
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_admin_settings'
  AND n.nspname = 'public';

COMMENT ON FUNCTION update_admin_settings IS 'FIXED: Updates admin settings with proper isolation between MainAdmin (buying_group_id = NULL) and buying groups (buying_group_id = UUID). Prevents cross-contamination of settings.';