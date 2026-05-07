-- ============================================================
-- Warehouse Management RPC Functions
-- Handles CRUD operations for MainAdmin warehouse management
-- ============================================================

-- ============================================================
-- 1. GET ALL WAREHOUSES
-- Returns all warehouses for MainAdmin portal
-- ============================================================

CREATE OR REPLACE FUNCTION get_warehouses()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 2. GET DEFAULT WAREHOUSE
-- Returns the default warehouse for system operations
-- ============================================================

CREATE OR REPLACE FUNCTION get_default_warehouse()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 3. CREATE WAREHOUSE
-- Creates a new warehouse
-- ============================================================

CREATE OR REPLACE FUNCTION create_warehouse(
  p_name TEXT,
  p_contact_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_street TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_zip TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'US',
  p_is_active BOOLEAN DEFAULT true,
  p_is_default BOOLEAN DEFAULT false,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 4. UPDATE WAREHOUSE
-- Updates an existing warehouse
-- ============================================================

CREATE OR REPLACE FUNCTION update_warehouse(
  p_warehouse_id UUID,
  p_name TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_street TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_zip TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 5. DELETE WAREHOUSE
-- Soft delete or hard delete a warehouse
-- ============================================================

CREATE OR REPLACE FUNCTION delete_warehouse(
  p_warehouse_id UUID,
  p_hard_delete BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_warehouses() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_default_warehouse() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION create_warehouse(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_warehouse(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_warehouse(UUID, BOOLEAN) TO authenticated, anon, service_role;