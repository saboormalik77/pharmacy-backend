-- Function : get_warehouses
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_warehouses() CASCADE;

CREATE OR REPLACE FUNCTION public.get_warehouses()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_warehouses JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
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
    ) ORDER BY w.is_default DESC, w.created_at DESC
  )
  INTO v_warehouses
  FROM warehouses w;
  
  RETURN jsonb_build_object(
    'error', false,
    'warehouses', COALESCE(v_warehouses, '[]'::jsonb)
  );
END;
$function$;
