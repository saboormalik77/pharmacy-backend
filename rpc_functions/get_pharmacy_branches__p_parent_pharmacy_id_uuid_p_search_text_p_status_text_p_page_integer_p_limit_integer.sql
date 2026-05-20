-- Function : get_pharmacy_branches
-- Arguments: p_parent_pharmacy_id uuid, p_search text, p_status text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_branches(p_parent_pharmacy_id uuid, p_search text, p_status text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_branches(p_parent_pharmacy_id uuid, p_search text DEFAULT NULL::text, p_status text DEFAULT 'all'::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset  INTEGER;
  v_total   BIGINT;
  v_result  JSONB := '[]'::jsonb;
  v_branch  RECORD;
  v_roles   JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_parent_pharmacy_id AND parent_pharmacy_id IS NULL AND can_manage_branches = TRUE) THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Access denied: not a pharmacy admin');
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM pharmacy
  WHERE parent_pharmacy_id = p_parent_pharmacy_id
    AND (p_status = 'all' OR status = p_status)
    AND (p_search IS NULL OR p_search = ''
         OR pharmacy_name ILIKE '%' || p_search || '%'
         OR email ILIKE '%' || p_search || '%'
         OR name ILIKE '%' || p_search || '%');

  FOR v_branch IN
    SELECT id, email, name, pharmacy_name, phone, physical_address,
           status, dea_number, created_at, updated_at
    FROM pharmacy
    WHERE parent_pharmacy_id = p_parent_pharmacy_id
      AND (p_status = 'all' OR status = p_status)
      AND (p_search IS NULL OR p_search = ''
           OR pharmacy_name ILIKE '%' || p_search || '%'
           OR email ILIKE '%' || p_search || '%'
           OR name ILIKE '%' || p_search || '%')
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset
  LOOP
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'roleId',   r.id,
      'roleName', r.role_name
    )), '[]'::jsonb)
    INTO v_roles
    FROM pharmacy_branch_role_assignments bra
    JOIN pharmacy_roles r ON r.id = bra.role_id
    WHERE bra.branch_pharmacy_id = v_branch.id;

    v_result := v_result || jsonb_build_object(
      'id',              v_branch.id,
      'email',           v_branch.email,
      'name',            v_branch.name,
      'pharmacyName',    v_branch.pharmacy_name,
      'phone',           v_branch.phone,
      'physicalAddress',  v_branch.physical_address,
      'status',          v_branch.status,
      'deaNumber',       v_branch.dea_number,
      'createdAt',       v_branch.created_at,
      'updatedAt',       v_branch.updated_at,
      'assignedRoles',   v_roles
    );
  END LOOP;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'branches',   v_result,
      'total',      v_total,
      'page',       p_page,
      'limit',      p_limit,
      'totalPages', CEIL(v_total::float / GREATEST(p_limit, 1))
    )
  );
END;
$function$;
