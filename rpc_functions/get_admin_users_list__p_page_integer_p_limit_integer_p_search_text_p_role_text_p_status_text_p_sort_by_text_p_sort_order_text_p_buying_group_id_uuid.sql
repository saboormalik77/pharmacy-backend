-- Function : get_admin_users_list
-- Arguments: p_page integer, p_limit integer, p_search text, p_role text, p_status text, p_sort_by text, p_sort_order text, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_users_list(p_page integer, p_limit integer, p_search text, p_role text, p_status text, p_sort_by text, p_sort_order text, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_users_list(p_page integer DEFAULT 1, p_limit integer DEFAULT 10, p_search text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_sort_by text DEFAULT 'created_at'::text, p_sort_order text DEFAULT 'desc'::text, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_admins JSONB;
  v_stats JSONB;
  v_total_admins INTEGER;
  v_active_admins INTEGER;
  v_super_admins INTEGER;
  v_managers INTEGER;
  v_reviewers INTEGER;
  v_support INTEGER;
  v_by_role JSONB;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;
  
  -- ============================================================
  -- STATS: Calculate statistics (scoped to buying group when provided)
  -- When p_buying_group_id is NULL (MainAdmin) → all admins globally.
  -- When scoped → the group's super_admin + its sub-admins.
  -- ============================================================
  
  -- Total admins
  SELECT COUNT(*)::INTEGER INTO v_total_admins
  FROM admin
  WHERE (p_buying_group_id IS NULL OR buying_group_id = p_buying_group_id);
  
  -- Active admins
  SELECT COUNT(*)::INTEGER INTO v_active_admins
  FROM admin
  WHERE is_active = true
    AND (p_buying_group_id IS NULL OR buying_group_id = p_buying_group_id);
  
  -- Count by role
  SELECT COUNT(*)::INTEGER INTO v_super_admins
  FROM admin
  WHERE role = 'super_admin'
    AND (p_buying_group_id IS NULL OR buying_group_id = p_buying_group_id);
  SELECT COUNT(*)::INTEGER INTO v_managers
  FROM admin
  WHERE role = 'manager'
    AND (p_buying_group_id IS NULL OR buying_group_id = p_buying_group_id);
  SELECT COUNT(*)::INTEGER INTO v_reviewers
  FROM admin
  WHERE role = 'reviewer'
    AND (p_buying_group_id IS NULL OR buying_group_id = p_buying_group_id);
  SELECT COUNT(*)::INTEGER INTO v_support
  FROM admin
  WHERE role = 'support'
    AND (p_buying_group_id IS NULL OR buying_group_id = p_buying_group_id);
  
  -- Build role breakdown
  v_by_role := jsonb_build_object(
    'super_admin', v_super_admins,
    'manager', v_managers,
    'reviewer', v_reviewers,
    'support', v_support
  );
  
  v_stats := jsonb_build_object(
    'totalAdmins', v_total_admins,
    'activeAdmins', v_active_admins,
    'inactiveAdmins', v_total_admins - v_active_admins,
    'superAdmins', v_super_admins,
    'managers', v_managers,
    'reviewers', v_reviewers,
    'support', v_support,
    'byRole', v_by_role
  );
  
  -- ============================================================
  -- COUNT: Get total matching records
  -- ============================================================
  
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM admin a
  WHERE 
    -- Buying group scope
    (p_buying_group_id IS NULL OR a.buying_group_id = p_buying_group_id)
    -- Search filter
    AND (p_search IS NULL OR p_search = '' OR
      a.name ILIKE '%' || p_search || '%' OR
      a.email ILIKE '%' || p_search || '%' OR
      a.id::TEXT ILIKE '%' || p_search || '%')
    -- Role filter
    AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR a.role = p_role)
    -- Status filter
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
      (p_status = 'active' AND a.is_active = true) OR
      (p_status = 'inactive' AND a.is_active = false));
  
  -- ============================================================
  -- FETCH: Get admin users with dynamic sorting
  -- ============================================================
  
  SELECT COALESCE(jsonb_agg(admin_row ORDER BY 
    CASE WHEN p_sort_order = 'asc' THEN NULL END,
    CASE WHEN p_sort_order = 'desc' THEN
      CASE p_sort_by
        WHEN 'name' THEN a.name
        WHEN 'email' THEN a.email
        WHEN 'role' THEN a.role
        WHEN 'created_at' THEN a.created_at::TEXT
        WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
        ELSE a.created_at::TEXT
      END
    END DESC NULLS LAST,
    CASE WHEN p_sort_order = 'asc' THEN
      CASE p_sort_by
        WHEN 'name' THEN a.name
        WHEN 'email' THEN a.email
        WHEN 'role' THEN a.role
        WHEN 'created_at' THEN a.created_at::TEXT
        WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
        ELSE a.created_at::TEXT
      END
    END ASC NULLS LAST
  ), '[]'::jsonb)
  INTO v_admins
  FROM (
    SELECT 
      a.id,
      a.email,
      a.name,
      a.role,
      a.is_active,
      CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END AS status,
      a.buying_group_id,
      a.permissions,
      a.last_login_at,
      a.created_at,
      a.updated_at
    FROM admin a
    WHERE 
      -- Buying group scope
      (p_buying_group_id IS NULL OR a.buying_group_id = p_buying_group_id)
      -- Search filter
      AND (p_search IS NULL OR p_search = '' OR
        a.name ILIKE '%' || p_search || '%' OR
        a.email ILIKE '%' || p_search || '%' OR
        a.id::TEXT ILIKE '%' || p_search || '%')
      -- Role filter
      AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR a.role = p_role)
      -- Status filter
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR 
        (p_status = 'active' AND a.is_active = true) OR
        (p_status = 'inactive' AND a.is_active = false))
    ORDER BY
      CASE WHEN p_sort_order = 'desc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'email' THEN a.email
          WHEN 'role' THEN a.role
          WHEN 'created_at' THEN a.created_at::TEXT
          WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
          ELSE a.created_at::TEXT
        END
      END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN
        CASE p_sort_by
          WHEN 'name' THEN a.name
          WHEN 'email' THEN a.email
          WHEN 'role' THEN a.role
          WHEN 'created_at' THEN a.created_at::TEXT
          WHEN 'last_login_at' THEN COALESCE(a.last_login_at::TEXT, '1970-01-01')
          ELSE a.created_at::TEXT
        END
      END ASC NULLS LAST
    LIMIT p_limit
    OFFSET v_offset
  ) a
  CROSS JOIN LATERAL (
    SELECT jsonb_build_object(
      'id', a.id,
      'email', a.email,
      'name', a.name,
      'role', a.role,
      'roleDisplay', CASE a.role
        WHEN 'super_admin' THEN 'Super Admin'
        WHEN 'manager' THEN 'Manager'
        WHEN 'reviewer' THEN 'Reviewer'
        WHEN 'support' THEN 'Support'
        ELSE a.role
      END,
      'isActive', a.is_active,
      'status', a.status,
      'permissions', COALESCE(a.permissions, '[]'::jsonb),
      'buyingGroupId', a.buying_group_id,
      'lastLoginAt', a.last_login_at,
      'createdAt', a.created_at,
      'updatedAt', a.updated_at
    ) AS admin_row
  ) admin_data;
  
  -- Return result
  RETURN jsonb_build_object(
    'admins', v_admins,
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
