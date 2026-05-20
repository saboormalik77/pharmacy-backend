-- Function : update_warehouse
-- Arguments: p_warehouse_id uuid, p_name text, p_contact_name text, p_phone text, p_street text, p_city text, p_state text, p_zip text, p_country text, p_is_active boolean, p_is_default boolean, p_updated_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_warehouse(p_warehouse_id uuid, p_name text, p_contact_name text, p_phone text, p_street text, p_city text, p_state text, p_zip text, p_country text, p_is_active boolean, p_is_default boolean, p_updated_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.update_warehouse(p_warehouse_id uuid, p_name text DEFAULT NULL::text, p_contact_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_street text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_zip text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_is_default boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_warehouse JSONB;
  v_exists BOOLEAN;
BEGIN
  -- Check if warehouse exists
  SELECT EXISTS(SELECT 1 FROM warehouses WHERE id = p_warehouse_id) INTO v_exists;
  
  IF NOT v_exists THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Warehouse not found'
    );
  END IF;
  
  -- If setting as default, remove default from other warehouses
  IF p_is_default = true THEN
    UPDATE warehouses SET is_default = false, updated_at = NOW() WHERE id != p_warehouse_id;
  END IF;
  
  -- Update warehouse
  UPDATE warehouses
  SET
    name = COALESCE(NULLIF(TRIM(p_name), ''), name),
    contact_name = COALESCE(p_contact_name, contact_name),
    phone = COALESCE(p_phone, phone),
    street = COALESCE(p_street, street),
    city = COALESCE(p_city, city),
    state = COALESCE(p_state, state),
    zip = COALESCE(p_zip, zip),
    country = COALESCE(p_country, country),
    is_active = COALESCE(p_is_active, is_active),
    is_default = COALESCE(p_is_default, is_default),
    updated_by = COALESCE(p_updated_by, updated_by),
    updated_at = NOW()
  WHERE id = p_warehouse_id;
  
  -- Fetch the updated warehouse
  SELECT jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'contactName', w.contact_name,
    'phone', w.phone,
    'street', w.street,
    'city', w.city,
    'state', w.state,
    'zip', w.zip,
    'country', w.country,
    'isActive', w.is_active,
    'isDefault', w.is_default,
    'createdAt', w.created_at,
    'updatedAt', w.updated_at
  )
  INTO v_warehouse
  FROM warehouses w
  WHERE w.id = p_warehouse_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Warehouse updated successfully',
    'warehouse', v_warehouse
  );
END;
$function$;
