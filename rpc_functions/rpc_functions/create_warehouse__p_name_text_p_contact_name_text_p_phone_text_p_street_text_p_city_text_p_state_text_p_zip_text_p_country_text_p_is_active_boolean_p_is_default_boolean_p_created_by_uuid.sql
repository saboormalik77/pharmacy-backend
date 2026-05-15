-- Function : create_warehouse
-- Arguments: p_name text, p_contact_name text, p_phone text, p_street text, p_city text, p_state text, p_zip text, p_country text, p_is_active boolean, p_is_default boolean, p_created_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_warehouse(p_name text, p_contact_name text, p_phone text, p_street text, p_city text, p_state text, p_zip text, p_country text, p_is_active boolean, p_is_default boolean, p_created_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.create_warehouse(p_name text, p_contact_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_street text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_zip text DEFAULT NULL::text, p_country text DEFAULT 'US'::text, p_is_active boolean DEFAULT true, p_is_default boolean DEFAULT false, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_warehouse_id UUID;
  v_warehouse JSONB;
BEGIN
  -- Validate required fields
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Warehouse name is required'
    );
  END IF;
  
  -- If setting as default, remove default from other warehouses
  IF p_is_default = true THEN
    UPDATE warehouses SET is_default = false, updated_at = NOW();
  END IF;
  
  -- Insert new warehouse
  INSERT INTO warehouses (
    name, contact_name, phone, street, city, state, zip, country,
    is_active, is_default, created_by, created_at, updated_at
  )
  VALUES (
    TRIM(p_name), p_contact_name, p_phone, p_street, p_city, p_state, p_zip, p_country,
    p_is_active, p_is_default, p_created_by, NOW(), NOW()
  )
  RETURNING id INTO v_warehouse_id;
  
  -- Fetch the created warehouse
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
  WHERE w.id = v_warehouse_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Warehouse created successfully',
    'warehouse', v_warehouse
  );
END;
$function$;
