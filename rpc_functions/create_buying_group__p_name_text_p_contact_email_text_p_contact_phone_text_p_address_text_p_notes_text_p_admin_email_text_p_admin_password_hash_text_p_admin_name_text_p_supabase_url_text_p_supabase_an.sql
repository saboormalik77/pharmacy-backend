-- Function : create_buying_group
-- Arguments: p_name text, p_contact_email text, p_contact_phone text, p_address text, p_notes text, p_admin_email text, p_admin_password_hash text, p_admin_name text, p_supabase_url text, p_supabase_anon_key text, p_supabase_service_role_key text, p_supabase_enabled boolean
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_buying_group(p_name text, p_contact_email text, p_contact_phone text, p_address text, p_notes text, p_admin_email text, p_admin_password_hash text, p_admin_name text, p_supabase_url text, p_supabase_anon_key text, p_supabase_service_role_key text, p_supabase_enabled boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.create_buying_group(p_name text, p_contact_email text DEFAULT NULL::text, p_contact_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_admin_email text DEFAULT NULL::text, p_admin_password_hash text DEFAULT NULL::text, p_admin_name text DEFAULT NULL::text, p_supabase_url text DEFAULT NULL::text, p_supabase_anon_key text DEFAULT NULL::text, p_supabase_service_role_key text DEFAULT NULL::text, p_supabase_enabled boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_id UUID;
  v_group JSONB;
  v_email TEXT;
  v_name TEXT;
BEGIN
  v_email := COALESCE(p_admin_email, p_contact_email);
  v_name := p_name;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Email is required'
    );
  END IF;

  IF p_admin_password_hash IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Password is required'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM admin WHERE email = v_email) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Email already exists'
    );
  END IF;

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
    buying_group_id,
    supabase_url,
    supabase_anon_key,
    supabase_service_role_key,
    supabase_enabled
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
    NULL,
    p_supabase_url,
    p_supabase_anon_key,
    p_supabase_service_role_key,
    p_supabase_enabled
  )
  RETURNING id INTO v_admin_id;

  UPDATE admin 
  SET buying_group_id = v_admin_id 
  WHERE id = v_admin_id;

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
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', 'active',
    'notes', a.notes,
    'createdAt', a.created_at,
    'role', a.role,
    'supabaseUrl', a.supabase_url,
    'supabaseEnabled', a.supabase_enabled
  )
  INTO v_group
  FROM admin a
  WHERE a.id = v_admin_id;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Buying group created successfully',
    'buyingGroup', v_group,
    'adminId', v_admin_id
  );
END;
$function$;
