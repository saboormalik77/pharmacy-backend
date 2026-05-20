-- Function : update_buying_group
-- Arguments: p_group_id uuid, p_name text, p_contact_email text, p_contact_phone text, p_address text, p_status text, p_notes text, p_supabase_url text, p_supabase_anon_key text, p_supabase_service_role_key text, p_supabase_enabled boolean
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_buying_group(p_group_id uuid, p_name text, p_contact_email text, p_contact_phone text, p_address text, p_status text, p_notes text, p_supabase_url text, p_supabase_anon_key text, p_supabase_service_role_key text, p_supabase_enabled boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.update_buying_group(p_group_id uuid, p_name text DEFAULT NULL::text, p_contact_email text DEFAULT NULL::text, p_contact_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_supabase_url text DEFAULT NULL::text, p_supabase_anon_key text DEFAULT NULL::text, p_supabase_service_role_key text DEFAULT NULL::text, p_supabase_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_group JSONB;
  v_is_active BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_group_id) THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  IF p_status IS NOT NULL THEN
    IF p_status = 'active' THEN
      v_is_active := true;
    ELSIF p_status IN ('inactive', 'suspended') THEN
      v_is_active := false;
    ELSE
      RETURN jsonb_build_object('error', true, 'message', 'Invalid status');
    END IF;
  END IF;

  IF p_contact_email IS NOT NULL AND public.email_is_in_use(LOWER(TRIM(p_contact_email)), p_exclude_admin_id => p_group_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'An account with this email already exists');
  END IF;

  UPDATE admin
  SET
    name          = COALESCE(p_name, name),
    email         = COALESCE(LOWER(TRIM(p_contact_email)), email),
    contact_phone = CASE WHEN p_contact_phone IS NOT NULL THEN p_contact_phone ELSE contact_phone END,
    address       = CASE WHEN p_address IS NOT NULL THEN p_address ELSE address END,
    notes         = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    is_active     = COALESCE(v_is_active, is_active),
    updated_at    = NOW(),
    supabase_url  = COALESCE(p_supabase_url, supabase_url),
    supabase_anon_key = COALESCE(p_supabase_anon_key, supabase_anon_key),
    supabase_service_role_key = COALESCE(p_supabase_service_role_key, supabase_service_role_key),
    supabase_enabled = COALESCE(p_supabase_enabled, supabase_enabled)
  WHERE id = p_group_id AND role = 'super_admin';

  IF p_name IS NOT NULL THEN
    UPDATE admin_settings
    SET business_name = p_name,
        updated_at = NOW()
    WHERE buying_group_id = p_group_id;
  END IF;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'contactEmail', a.email,
    'contactPhone', a.contact_phone,
    'address', a.address,
    'status', CASE 
      WHEN a.is_active = true THEN 'active'
      WHEN a.role = 'suspended' THEN 'suspended'
      ELSE 'inactive'
    END,
    'notes', a.notes,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at,
    'role', a.role,
    'supabaseUrl', a.supabase_url,
    'supabaseAnonKey', a.supabase_anon_key,
    'supabaseServiceRoleKey', a.supabase_service_role_key,
    'supabaseEnabled', a.supabase_enabled
  )
  INTO v_group
  FROM admin a
  WHERE a.id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Buying group updated successfully',
    'buyingGroup', v_group
  );
END;
$function$;
