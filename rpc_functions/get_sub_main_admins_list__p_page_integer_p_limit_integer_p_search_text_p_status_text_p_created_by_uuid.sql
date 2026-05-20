-- Function : get_sub_main_admins_list
-- Arguments: p_page integer, p_limit integer, p_search text, p_status text, p_created_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_sub_main_admins_list(p_page integer, p_limit integer, p_search text, p_status text, p_created_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_sub_main_admins_list(p_page integer DEFAULT 1, p_limit integer DEFAULT 10, p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_admins JSONB;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM sub_main_admin s
  WHERE
    (p_search IS NULL OR p_search = '' OR
      s.name ILIKE '%' || p_search || '%' OR
      s.email ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR
      (p_status = 'active' AND s.is_active = true) OR
      (p_status = 'inactive' AND s.is_active = false));

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_admins
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'email', s.email,
      'name', s.name,
      'role', s.role,
      'permissions', CASE 
        WHEN jsonb_typeof(s.permissions) = 'array' THEN s.permissions
        ELSE '[]'::jsonb
      END,
      'is_active', s.is_active,
      'invite_accepted_at', s.invite_accepted_at,
      'last_login_at', s.last_login_at,
      'created_at', s.created_at,
      'updated_at', s.updated_at
    ) AS row_data
    FROM sub_main_admin s
    WHERE
      (p_search IS NULL OR p_search = '' OR
        s.name ILIKE '%' || p_search || '%' OR
        s.email ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR
        (p_status = 'active' AND s.is_active = true) OR
        (p_status = 'inactive' AND s.is_active = false))
    ORDER BY s.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'admins', v_admins,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::NUMERIC / p_limit)::INTEGER
    )
  );
END;
$function$;
