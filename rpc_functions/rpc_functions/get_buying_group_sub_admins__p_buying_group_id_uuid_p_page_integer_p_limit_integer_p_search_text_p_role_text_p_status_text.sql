-- Function : get_buying_group_sub_admins
-- Arguments: p_buying_group_id uuid, p_page integer, p_limit integer, p_search text, p_role text, p_status text
-- Type     : FUNCTION
-- Returns sub-admins (manager/reviewer/support) for a buying group, excluding the super_admin owner.
-- =============================================================

DROP FUNCTION IF EXISTS public.get_buying_group_sub_admins(p_buying_group_id uuid, p_page integer, p_limit integer, p_search text, p_role text, p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_buying_group_sub_admins(
  p_buying_group_id uuid,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20,
  p_search text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_status text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_sub_admins JSONB;
  v_stats JSONB;
  v_total_count INTEGER;
  v_active_count INTEGER;
  v_managers INTEGER;
  v_reviewers INTEGER;
  v_support INTEGER;
BEGIN
  IF p_buying_group_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'buying_group_id is required');
  END IF;

  -- Verify the buying group exists
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_buying_group_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  v_offset := (COALESCE(p_page, 1) - 1) * COALESCE(p_limit, 20);

  -- Stats: only sub-admin roles (exclude super_admin owner)
  SELECT COUNT(*)::INTEGER INTO v_total_count
  FROM admin
  WHERE buying_group_id = p_buying_group_id
    AND role IN ('manager', 'reviewer', 'support');

  SELECT COUNT(*)::INTEGER INTO v_active_count
  FROM admin
  WHERE buying_group_id = p_buying_group_id
    AND role IN ('manager', 'reviewer', 'support')
    AND is_active = true;

  SELECT COUNT(*)::INTEGER INTO v_managers
  FROM admin
  WHERE buying_group_id = p_buying_group_id AND role = 'manager';

  SELECT COUNT(*)::INTEGER INTO v_reviewers
  FROM admin
  WHERE buying_group_id = p_buying_group_id AND role = 'reviewer';

  SELECT COUNT(*)::INTEGER INTO v_support
  FROM admin
  WHERE buying_group_id = p_buying_group_id AND role = 'support';

  v_stats := jsonb_build_object(
    'total', v_total_count,
    'active', v_active_count,
    'inactive', v_total_count - v_active_count,
    'managers', v_managers,
    'reviewers', v_reviewers,
    'support', v_support
  );

  -- Filtered total for pagination
  SELECT COUNT(*)::INTEGER INTO v_total
  FROM admin
  WHERE buying_group_id = p_buying_group_id
    AND role IN ('manager', 'reviewer', 'support')
    AND (p_search IS NULL OR p_search = '' OR
         name ILIKE '%' || p_search || '%' OR
         email ILIKE '%' || p_search || '%')
    AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR role = p_role)
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR
         (p_status = 'active' AND is_active = true) OR
         (p_status = 'inactive' AND is_active = false));

  -- Fetch sub-admins
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'email', a.email,
      'name', a.name,
      'role', a.role,
      'roleDisplay', CASE a.role
        WHEN 'manager' THEN 'Manager'
        WHEN 'reviewer' THEN 'Reviewer'
        WHEN 'support' THEN 'Support'
        ELSE a.role
      END,
      'isActive', a.is_active,
      'status', CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
      'permissions', COALESCE(a.permissions, '[]'::jsonb),
      'buyingGroupId', a.buying_group_id,
      'lastLoginAt', a.last_login_at,
      'createdAt', a.created_at,
      'updatedAt', a.updated_at
    )
    ORDER BY a.created_at DESC
  ), '[]'::jsonb)
  INTO v_sub_admins
  FROM admin a
  WHERE a.buying_group_id = p_buying_group_id
    AND a.role IN ('manager', 'reviewer', 'support')
    AND (p_search IS NULL OR p_search = '' OR
         a.name ILIKE '%' || p_search || '%' OR
         a.email ILIKE '%' || p_search || '%')
    AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR a.role = p_role)
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR
         (p_status = 'active' AND a.is_active = true) OR
         (p_status = 'inactive' AND a.is_active = false))
  LIMIT COALESCE(p_limit, 20)
  OFFSET v_offset;

  RETURN jsonb_build_object(
    'error', false,
    'subAdmins', v_sub_admins,
    'stats', v_stats,
    'pagination', jsonb_build_object(
      'page', COALESCE(p_page, 1),
      'limit', COALESCE(p_limit, 20),
      'total', v_total,
      'totalPages', CEIL(v_total::NUMERIC / COALESCE(p_limit, 20))::INTEGER
    )
  );
END;
$function$;
