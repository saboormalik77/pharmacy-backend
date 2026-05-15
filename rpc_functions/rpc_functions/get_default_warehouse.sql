-- Function : get_default_warehouse
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_default_warehouse() CASCADE;

CREATE OR REPLACE FUNCTION public.get_default_warehouse()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_warehouse JSONB;
BEGIN
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
  WHERE w.is_default = true AND w.is_active = true;
  
  -- If no default warehouse, get the first active one
  IF v_warehouse IS NULL THEN
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
    WHERE w.is_active = true
    ORDER BY w.created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'warehouse', v_warehouse
  );
END;
$function$;
