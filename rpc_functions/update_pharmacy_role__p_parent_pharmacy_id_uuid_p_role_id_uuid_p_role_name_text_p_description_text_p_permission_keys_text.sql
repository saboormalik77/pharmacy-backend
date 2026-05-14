-- Function : update_pharmacy_role
-- Arguments: p_parent_pharmacy_id uuid, p_role_id uuid, p_role_name text, p_description text, p_permission_keys text[]
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_pharmacy_role(p_parent_pharmacy_id uuid, p_role_id uuid, p_role_name text, p_description text, p_permission_keys text[]) CASCADE;

CREATE OR REPLACE FUNCTION public.update_pharmacy_role(p_parent_pharmacy_id uuid, p_role_id uuid, p_role_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_permission_keys text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_existing RECORD;
  v_perm_id  UUID;
  v_key      TEXT;
BEGIN
  SELECT * INTO v_existing FROM pharmacy_roles
  WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  IF p_role_name IS NOT NULL AND TRIM(p_role_name) != '' THEN
    IF EXISTS (SELECT 1 FROM pharmacy_roles
               WHERE parent_pharmacy_id = p_parent_pharmacy_id
                 AND role_name = TRIM(p_role_name) AND id != p_role_id) THEN
      RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A role with this name already exists');
    END IF;
    UPDATE pharmacy_roles SET role_name = TRIM(p_role_name), updated_at = NOW() WHERE id = p_role_id;
  END IF;

  IF p_description IS NOT NULL THEN
    UPDATE pharmacy_roles SET description = p_description, updated_at = NOW() WHERE id = p_role_id;
  END IF;

  IF p_permission_keys IS NOT NULL THEN
    DELETE FROM pharmacy_role_permissions WHERE role_id = p_role_id;

    IF array_length(p_permission_keys, 1) > 0 THEN
      FOREACH v_key IN ARRAY p_permission_keys LOOP
        SELECT id INTO v_perm_id FROM pharmacy_permissions WHERE permission_key = v_key;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO pharmacy_role_permissions (role_id, permission_id) VALUES (p_role_id, v_perm_id)
          ON CONFLICT DO NOTHING;
        END IF;
        v_perm_id := NULL;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('roleId', p_role_id));
END;
$function$;
