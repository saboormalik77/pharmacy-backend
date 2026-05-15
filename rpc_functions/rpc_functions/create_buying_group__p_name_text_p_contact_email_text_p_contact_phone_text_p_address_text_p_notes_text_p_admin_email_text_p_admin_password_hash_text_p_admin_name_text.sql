-- Function : create_buying_group
-- Arguments: p_name text, p_contact_email text, p_contact_phone text, p_address text, p_notes text, p_admin_email text, p_admin_password_hash text, p_admin_name text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_buying_group(p_name text, p_contact_email text, p_contact_phone text, p_address text, p_notes text, p_admin_email text, p_admin_password_hash text, p_admin_name text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_buying_group(p_name text, p_contact_email text DEFAULT NULL::text, p_contact_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_admin_email text DEFAULT NULL::text, p_admin_password_hash text DEFAULT NULL::text, p_admin_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
