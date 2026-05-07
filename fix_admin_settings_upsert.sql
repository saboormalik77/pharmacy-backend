-- Fix the update_admin_settings function to handle ON CONFLICT correctly
-- The issue is that when buying_group_id IS NULL, we can't use the same ON CONFLICT clause

CREATE OR REPLACE FUNCTION public.update_admin_settings(
  p_site_name text DEFAULT NULL::text, 
  p_site_email text DEFAULT NULL::text, 
  p_timezone text DEFAULT NULL::text, 
  p_language text DEFAULT NULL::text, 
  p_email_notifications boolean DEFAULT NULL::boolean, 
  p_document_approval_notif boolean DEFAULT NULL::boolean, 
  p_payment_notif boolean DEFAULT NULL::boolean, 
  p_shipment_notif boolean DEFAULT NULL::boolean, 
  p_warehouse_name text DEFAULT NULL::text, 
  p_warehouse_street text DEFAULT NULL::text, 
  p_warehouse_city text DEFAULT NULL::text, 
  p_warehouse_state text DEFAULT NULL::text, 
  p_warehouse_zip text DEFAULT NULL::text, 
  p_warehouse_country text DEFAULT NULL::text, 
  p_warehouse_phone text DEFAULT NULL::text, 
  p_warehouse_contact_name text DEFAULT NULL::text, 
  p_business_name text DEFAULT NULL::text, 
  p_logo_url text DEFAULT NULL::text, 
  p_buying_group_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
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
  
  -- Handle buying group specific settings (buying_group_id IS NOT NULL)
  IF p_buying_group_id IS NOT NULL THEN
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
  ELSE
    -- Handle global settings (MainAdmin) separately due to different conflict condition
    -- For global settings, use UPDATE first approach since we can't use buying_group_id in ON CONFLICT
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
    
    -- If no global settings row exists, create one
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