-- ============================================================
-- Fix: create_buying_group should set business_name in admin_settings
-- scoped to the buying group (not global settings)
-- ============================================================

CREATE OR REPLACE FUNCTION create_buying_group(
  p_name TEXT,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL,
  p_admin_password_hash TEXT DEFAULT NULL,
  p_admin_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_group    JSONB;
  v_email    TEXT;
  v_name     TEXT;
BEGIN
  v_email := COALESCE(p_admin_email, p_contact_email);
  v_name  := p_name;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Email is required');
  END IF;

  IF p_admin_password_hash IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Password is required');
  END IF;

  IF EXISTS (SELECT 1 FROM admin WHERE email = v_email) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Email already exists');
  END IF;

  -- Create admin record — now includes contact_phone, address, notes
  INSERT INTO admin (
    email,
    password_hash,
    name,
    role,
    is_active,
    permissions,
    contact_phone,
    address,
    notes,
    buying_group_id  -- Set buying_group_id to self (self-referencing for super_admin)
  )
  VALUES (
    v_email,
    p_admin_password_hash,
    v_name,
    'super_admin',
    true,
    '["dashboard","pharmacies","distributors","marketplace","documents","payments","payout_hub","analytics","settings","admins","processors","policies","ndc_pricing","tbd_items","destruction","warehouse"]'::jsonb,
    p_contact_phone,
    p_address,
    p_notes,
    NULL  -- Will be updated in the next step
  )
  RETURNING id INTO v_admin_id;

  -- Update the admin record to set buying_group_id to itself (self-referencing)
  UPDATE admin 
  SET buying_group_id = v_admin_id 
  WHERE id = v_admin_id;

  -- Create admin_settings record for this buying group with business_name set to group name
  INSERT INTO admin_settings (
    buying_group_id, 
    business_name,
    created_at, 
    updated_at
  )
  VALUES (
    v_admin_id,
    p_name,
    NOW(),
    NOW()
  );

  SELECT jsonb_build_object(
    'id',           a.id,
    'name',         a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address',      a.address,
    'notes',        a.notes,
    'status',       'active',
    'createdAt',    a.created_at,
    'role',         a.role
  )
  INTO v_group
  FROM admin a
  WHERE a.id = v_admin_id;

  RETURN jsonb_build_object(
    'error',      false,
    'message',    'Buying group created successfully',
    'buyingGroup', v_group,
    'adminId',    v_admin_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_buying_group TO authenticated, anon, service_role;

-- ============================================================
-- Also update update_buying_group to sync business_name when 
-- the buying group name is updated
-- ============================================================

CREATE OR REPLACE FUNCTION update_buying_group(
  p_group_id UUID,
  p_name TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_record RECORD;
  v_buying_group JSONB;
BEGIN
  -- Check if buying group exists
  SELECT id, role INTO v_admin_record
  FROM admin
  WHERE id = p_group_id AND role = 'super_admin';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Buying group not found or invalid role'
    );
  END IF;

  -- Update the admin record (represents the buying group)
  UPDATE admin
  SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_contact_email, email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    address = COALESCE(p_address, address),
    notes = COALESCE(p_notes, notes),
    is_active = CASE
      WHEN p_status = 'active' THEN true
      WHEN p_status = 'inactive' THEN false
      WHEN p_status = 'suspended' THEN false
      ELSE is_active
    END,
    updated_at = NOW()
  WHERE id = p_group_id;

  -- If name is being updated, also update business_name in admin_settings
  IF p_name IS NOT NULL THEN
    UPDATE admin_settings
    SET 
      business_name = p_name,
      updated_at = NOW()
    WHERE buying_group_id = p_group_id;
  END IF;

  -- Return the updated buying group
  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', CASE
      WHEN a.is_active THEN 'active'
      ELSE 'inactive'
    END,
    'notes', a.notes,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at,
    'role', a.role
  )
  INTO v_buying_group
  FROM admin a
  WHERE a.id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Buying group updated successfully',
    'buyingGroup', v_buying_group
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_buying_group TO authenticated, anon, service_role;

-- ============================================================
-- Data Migration: Fix existing buying groups
-- ============================================================

-- Step 1: Update existing super_admin records to set buying_group_id to themselves
UPDATE admin
SET buying_group_id = id
WHERE role = 'super_admin' 
  AND (buying_group_id IS NULL OR buying_group_id != id);

-- Step 2: Create admin_settings records for existing buying groups that don't have one
-- Insert admin_settings for each super_admin (buying group) with their name as business_name
INSERT INTO admin_settings (buying_group_id, business_name, created_at, updated_at)
SELECT 
  a.id as buying_group_id,
  a.name as business_name,
  NOW() as created_at,
  NOW() as updated_at
FROM admin a
WHERE a.role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM admin_settings s 
    WHERE s.buying_group_id = a.id
  );
