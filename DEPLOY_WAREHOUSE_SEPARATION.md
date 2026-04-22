# 🏭 Warehouse Separation & Settings Multi-Tenancy Deployment Guide

## Overview

This deployment addresses two issues:
1. **Business Settings Multi-Tenancy**: Fixed the issue where one buying group's logo/business name changes affected all buying groups
2. **Warehouse Separation**: Moved warehouse management from `admin_settings` to a dedicated `warehouses` table for MainAdmin portal

## ✅ What's Already Done (Backend Code Changes)

- ✅ Updated `admin_settings` RPC functions to accept `buying_group_id` parameter
- ✅ Updated backend services and controllers to pass buying group context
- ✅ Created separate `warehouses` table and management APIs
- ✅ Updated admin settings page to hide General Settings and Warehouse sections for buying group admins
- ✅ Added proper multi-tenancy scoping for business name and logo uploads

## 🚀 Manual Deployment Steps Required

### Step 1: Deploy Business Settings Multi-Tenancy (CRITICAL)

Go to your **Supabase Dashboard → SQL Editor** and run:

```sql
-- 1. Update get_admin_settings function to support buying group scoping
DROP FUNCTION IF EXISTS get_admin_settings();

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_settings(UUID) TO authenticated, anon, service_role;
```

### Step 2: Deploy Updated update_admin_settings Function

```sql
-- Drop old function and create new one with buying group support
DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

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
    RETURN jsonb_build_object('error', true, 'message', 'Invalid timezone');
  END IF;
  
  -- Validate language if provided
  IF p_language IS NOT NULL AND p_language NOT IN ('en', 'es', 'fr') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid language');
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
GRANT EXECUTE ON FUNCTION update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon, service_role;
```

### Step 3: Create Warehouses Table (Optional for Future)

This is for the MainAdmin portal to manage warehouses separately from business settings:

```sql
-- Create warehouses table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Warehouse Details
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  
  -- Address Information
  street TEXT,
  city VARCHAR(100),
  state VARCHAR(10),
  zip VARCHAR(20),
  country VARCHAR(10) DEFAULT 'US',
  
  -- Status and Management
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admin(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admin(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_unique_default 
  ON warehouses(is_default) 
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_warehouses_active 
  ON warehouses(is_active);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can access warehouses" ON public.warehouses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default warehouse data
INSERT INTO public.warehouses (
  name, contact_name, phone, street, city, state, zip, country, 
  is_active, is_default, created_at, updated_at
)
VALUES (
  'truemedit warehouse',
  'Saboor Malik',
  '4695557890',
  '14951 Dallas Pkwy, Suite 300',
  'Addison',
  'TX',
  '75001',
  'US',
  true,
  true,
  '2025-12-24 10:24:22.912854+00'::timestamp with time zone,
  NOW()
)
ON CONFLICT DO NOTHING;
```

## 🔧 Fixed: Original Warehouse System Restored

**IMPORTANT**: I initially overwrote your existing warehouse receiving/verification system by mistake. I've now:

✅ **Restored** your original warehouse system (`/api/admin/warehouse/*` routes)  
✅ **Created separate** warehouse management system (`/api/admin/warehouse-management/*` routes)

Your original warehouse endpoints like `/api/admin/warehouse/received` are now working again!

## 🐛 If you get syntax errors on warehouse functions:

The warehouse functions in **Step 3** are **optional** and not needed for the main multi-tenancy fix. If you encounter syntax errors, **skip Step 3** and focus only on **Steps 1 and 2** which fix the business settings multi-tenancy issue.

## ✅ What This Fixes

### Business Settings Multi-Tenancy
- ✅ Each buying group now has their own business name and logo
- ✅ When buying group A changes their logo, it won't affect buying group B
- ✅ Settings are properly scoped to `buying_group_id`
- ✅ MainAdmin still has global settings (`buying_group_id = NULL`)

### UI Improvements for Buying Groups
- ✅ **General Settings section** is hidden for buying group admins
- ✅ **Warehouse/Shipping Address section** is hidden for buying group admins  
- ✅ Buying group admins see a helpful info message explaining what they can manage
- ✅ Page description changes based on user type

## 🧪 Testing

After deployment, test by:

1. **Login as Buying Group Admin**: 
   - Go to Settings page
   - Verify General Settings and Warehouse sections are hidden
   - Update business name/logo - should only affect your buying group

2. **Login as MainAdmin**:
   - Go to Settings page  
   - Verify all sections are visible
   - Update settings - should be global

3. **Multi-Tenancy Test**:
   - Have two different buying group admins update their logos
   - Verify each group sees only their own logo

## 🚨 Important Notes

1. **Deploy Step 1 and 2 first** - These are critical for the business settings multi-tenancy fix
2. **Step 3 (warehouses table)** is optional and for future MainAdmin warehouse management
3. **Restart your backend** after deployment to ensure the new functions are loaded
4. **Test thoroughly** with different buying group admin accounts

The fix is complete once you deploy the updated RPC functions! 🎉