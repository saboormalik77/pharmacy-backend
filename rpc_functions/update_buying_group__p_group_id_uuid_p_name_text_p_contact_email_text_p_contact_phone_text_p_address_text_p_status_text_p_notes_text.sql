-- Function : update_buying_group
-- Arguments: p_group_id uuid, p_name text, p_contact_email text, p_contact_phone text, p_address text, p_status text, p_notes text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_buying_group(p_group_id uuid, p_name text, p_contact_email text, p_contact_phone text, p_address text, p_status text, p_notes text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_buying_group(p_group_id uuid, p_name text DEFAULT NULL::text, p_contact_email text DEFAULT NULL::text, p_contact_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
