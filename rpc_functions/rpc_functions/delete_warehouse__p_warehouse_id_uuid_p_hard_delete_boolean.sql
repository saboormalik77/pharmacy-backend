-- Function : delete_warehouse
-- Arguments: p_warehouse_id uuid, p_hard_delete boolean
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_warehouse(p_warehouse_id uuid, p_hard_delete boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_warehouse(p_warehouse_id uuid, p_hard_delete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_exists BOOLEAN;
  v_is_default BOOLEAN;
  v_warehouse_count INTEGER;
BEGIN
  -- Check if warehouse exists
  SELECT 
    EXISTS(SELECT 1 FROM warehouses WHERE id = p_warehouse_id),
    is_default
  INTO v_exists, v_is_default
  FROM warehouses WHERE id = p_warehouse_id;
  
  IF NOT v_exists THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Warehouse not found'
    );
  END IF;
  
  -- Count total active warehouses
  SELECT COUNT(*) INTO v_warehouse_count FROM warehouses WHERE is_active = true;
  
  -- Prevent deletion if it's the last active warehouse
  IF v_warehouse_count <= 1 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cannot delete the last active warehouse'
    );
  END IF;
  
  -- If deleting default warehouse, assign default to another active warehouse
  IF v_is_default = true THEN
    UPDATE warehouses 
    SET is_default = true, updated_at = NOW()
    WHERE id = (
      SELECT id 
      FROM warehouses 
      WHERE id != p_warehouse_id AND is_active = true 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
  
  IF p_hard_delete = true THEN
    -- Hard delete
    DELETE FROM warehouses WHERE id = p_warehouse_id;
  ELSE
    -- Soft delete
    UPDATE warehouses 
    SET is_active = false, is_default = false, updated_at = NOW()
    WHERE id = p_warehouse_id;
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Warehouse deleted successfully'
  );
END;
$function$;
