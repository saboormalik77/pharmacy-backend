-- Function : get_buying_groups_list
-- Arguments: p_page integer, p_limit integer, p_search text, p_status text, p_sort_by text, p_sort_order text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_buying_groups_list(p_page integer, p_limit integer, p_search text, p_status text, p_sort_by text, p_sort_order text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_buying_groups_list(p_page integer DEFAULT 1, p_limit integer DEFAULT 10, p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_sort_by text DEFAULT 'created_at'::text, p_sort_order text DEFAULT 'desc'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_groups JSONB;
  v_stats JSONB;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  -- Stats (using admin table, treating is_active as status, only super_admin role)
  SELECT jsonb_build_object(
    'total', COUNT(*)::INTEGER,
    'active', COUNT(*) FILTER (WHERE a.is_active = true)::INTEGER,
    'inactive', COUNT(*) FILTER (WHERE a.is_active = false)::INTEGER,
    'suspended', 0::INTEGER
  )
  INTO v_stats
  FROM admin a
  WHERE a.role = 'super_admin' AND a.buying_group_id = a.id;

  -- Count
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM admin a
  WHERE
    a.role = 'super_admin'
    AND a.buying_group_id = a.id
    AND (p_search IS NULL OR p_search = '' OR
      a.name ILIKE '%' || p_search || '%' OR
      a.email ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
      (p_status = 'active' AND a.is_active = true) OR
      (p_status = 'inactive' AND a.is_active = false));

  -- Fetch (treating admin records as buying groups)
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_groups
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'contactEmail', a.email,
      'contactPhone', a.contact_phone,
      'address', a.address,
      'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
      'notes', a.notes,
      'createdAt', a.created_at,
      'updatedAt', a.updated_at,
      'adminCount', (
        SELECT COUNT(*)::INTEGER 
        FROM admin a2 
        WHERE a2.buying_group_id = a.id AND a2.role != 'super_admin'
      ),
      'role', a.role,
      'lastLoginAt', a.last_login_at,
      'supabaseUrl', a.supabase_url,
      'supabaseAnonKey', a.supabase_anon_key,
      'supabaseServiceRoleKey', a.supabase_service_role_key,
      'supabaseEnabled', a.supabase_enabled
    ) AS row_data
    FROM admin a
    WHERE
      a.role = 'super_admin'
      AND a.buying_group_id = a.id
      AND (p_search IS NULL OR p_search = '' OR
        a.name ILIKE '%' || p_search || '%' OR
        a.email ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
        (p_status = 'active' AND a.is_active = true) OR
        (p_status = 'inactive' AND a.is_active = false))
    ORDER BY
      CASE WHEN p_sort_order = 'desc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'status' THEN a.is_active::TEXT
          WHEN 'created_at' THEN a.created_at::TEXT
          ELSE a.created_at::TEXT
        END
      END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'status' THEN a.is_active::TEXT
          WHEN 'created_at' THEN a.created_at::TEXT
          ELSE a.created_at::TEXT
        END
      END ASC NULLS LAST
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'buyingGroups', v_groups,
    'stats', v_stats,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::NUMERIC / p_limit)::INTEGER
    )
  );
END;
$function$;
