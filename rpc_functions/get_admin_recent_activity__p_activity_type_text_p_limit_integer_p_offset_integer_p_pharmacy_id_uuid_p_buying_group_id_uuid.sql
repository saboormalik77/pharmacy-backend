-- Function : get_admin_recent_activity
-- Arguments: p_activity_type text, p_limit integer, p_offset integer, p_pharmacy_id uuid, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_recent_activity(p_activity_type text, p_limit integer, p_offset integer, p_pharmacy_id uuid, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_recent_activity(p_activity_type text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_pharmacy_id uuid DEFAULT NULL::uuid, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_activities JSONB;
    v_total_count INTEGER;
    v_today_count INTEGER;
    v_this_week_count INTEGER;
    v_unread_count INTEGER;
BEGIN
    -- ============================================================
    -- Get total count (with filters + buying group scope)
    -- ============================================================
    SELECT COUNT(*)::INTEGER
    INTO v_total_count
    FROM admin_recent_activity a
    INNER JOIN pharmacy p ON a.pharmacy_id = p.id
    WHERE (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id)
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    -- ============================================================
    -- Get today's activity count
    -- ============================================================
    SELECT COUNT(*)::INTEGER
    INTO v_today_count
    FROM admin_recent_activity a
    INNER JOIN pharmacy p ON a.pharmacy_id = p.id
    WHERE a.created_at >= DATE_TRUNC('day', NOW())
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id)
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    -- ============================================================
    -- Get this week's activity count
    -- ============================================================
    SELECT COUNT(*)::INTEGER
    INTO v_this_week_count
    FROM admin_recent_activity a
    INNER JOIN pharmacy p ON a.pharmacy_id = p.id
    WHERE a.created_at >= DATE_TRUNC('week', NOW())
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id)
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    -- ============================================================
    -- Get unread activity count
    -- ============================================================
    SELECT COUNT(*)::INTEGER
    INTO v_unread_count
    FROM admin_recent_activity a
    INNER JOIN pharmacy p ON a.pharmacy_id = p.id
    WHERE a.is_read = false
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id)
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    -- ============================================================
    -- Get activities with pharmacy info (scoped to buying group)
    -- ============================================================
    SELECT COALESCE(jsonb_agg(activity_data ORDER BY activity_data->>'created_at' DESC), '[]'::JSONB)
    INTO v_activities
    FROM (
        SELECT jsonb_build_object(
            'id', a.id,
            'activityType', a.activity_type,
            'entityId', a.entity_id,
            'entityName', a.entity_name,
            'metadata', a.metadata,
            'createdAt', a.created_at,
            'isRead', a.is_read,
            'readAt', a.read_at,
            'pharmacy', jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'pharmacyName', p.pharmacy_name,
                'email', p.email
            )
        ) as activity_data
        FROM admin_recent_activity a
        INNER JOIN pharmacy p ON a.pharmacy_id = p.id
        WHERE (p_activity_type IS NULL OR a.activity_type = p_activity_type)
        AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id)
        AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
        ORDER BY a.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) sub;

    -- ============================================================
    -- Build final result
    -- ============================================================
    v_result := jsonb_build_object(
        'activities', v_activities,
        'pagination', jsonb_build_object(
            'total', v_total_count,
            'limit', p_limit,
            'offset', p_offset,
            'hasMore', (p_offset + p_limit) < v_total_count
        ),
        'stats', jsonb_build_object(
            'todayCount', v_today_count,
            'thisWeekCount', v_this_week_count,
            'totalCount', v_total_count,
            'unreadCount', v_unread_count
        ),
        'filters', jsonb_build_object(
            'activityType', p_activity_type,
            'pharmacyId', p_pharmacy_id
        ),
        'generatedAt', NOW()
    );

    RETURN v_result;
END;
$function$;
