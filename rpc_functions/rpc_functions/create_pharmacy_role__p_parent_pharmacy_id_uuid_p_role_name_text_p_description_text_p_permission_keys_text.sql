-- Function : create_pharmacy_role
-- Arguments: p_parent_pharmacy_id uuid, p_role_name text, p_description text, p_permission_keys text[]
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_pharmacy_role(p_parent_pharmacy_id uuid, p_role_name text, p_description text, p_permission_keys text[]) CASCADE;

CREATE OR REPLACE FUNCTION public.create_pharmacy_role(p_parent_pharmacy_id uuid, p_role_name text, p_description text DEFAULT NULL::text, p_permission_keys text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
  v_key     TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_parent_pharmacy_id AND parent_pharmacy_id IS NULL AND can_manage_branches = TRUE) THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Access denied');
  END IF;

  IF p_role_name IS NULL OR TRIM(p_role_name) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Role name is required');
  END IF;

  IF EXISTS (SELECT 1 FROM pharmacy_roles WHERE parent_pharmacy_id = p_parent_pharmacy_id AND role_name = TRIM(p_role_name)) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A role with this name already exists');
  END IF;

  INSERT INTO pharmacy_roles (parent_pharmacy_id, role_name, description)
  VALUES (p_parent_pharmacy_id, TRIM(p_role_name), p_description)
  RETURNING id INTO v_role_id;

  IF array_length(p_permission_keys, 1) > 0 THEN
    FOREACH v_key IN ARRAY p_permission_keys LOOP
      SELECT id INTO v_perm_id FROM pharmacy_permissions WHERE permission_key = v_key;
      IF v_perm_id IS NOT NULL THEN
        INSERT INTO pharmacy_role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
      END IF;
      v_perm_id := NULL;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('roleId', v_role_id, 'roleName', TRIM(p_role_name)));
END;
$function$;
