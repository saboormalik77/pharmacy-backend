-- ============================================================
-- RPC Function: get_admin_recent_activity
-- Used by: GET /api/admin/recent-activity
-- ============================================================
-- Returns recent activity records for admin dashboard
-- Includes: document uploads, product additions, pharmacy registrations
-- Supports filtering by activity type and pagination
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID, UUID);

CREATE OR REPLACE FUNCTION get_admin_recent_activity(
    p_activity_type TEXT DEFAULT NULL,  -- Filter by activity type (null = all)
    p_limit INTEGER DEFAULT 20,          -- Number of records to return
    p_offset INTEGER DEFAULT 0,          -- Offset for pagination
    p_pharmacy_id UUID DEFAULT NULL,     -- Filter by specific pharmacy (null = all)
    p_buying_group_id UUID DEFAULT NULL -- Scope to buying group (null = MainAdmin, sees all)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID, UUID) TO service_role;

-- ============================================================
-- RPC Function: mark_all_admin_activities_read
-- Marks all unread activities as read (scoped to buying group)
-- ============================================================

DROP FUNCTION IF EXISTS mark_all_admin_activities_read();
DROP FUNCTION IF EXISTS mark_all_admin_activities_read(UUID);

CREATE OR REPLACE FUNCTION mark_all_admin_activities_read(
    p_buying_group_id UUID DEFAULT NULL -- Scope to buying group (null = MainAdmin, affects all)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update all unread activities to read (scoped to buying group)
    UPDATE admin_recent_activity
    SET is_read = TRUE,
        read_at = NOW()
    WHERE (is_read = FALSE OR is_read IS NULL)
    AND (
        p_buying_group_id IS NULL OR 
        pharmacy_id IN (
            SELECT id FROM pharmacy WHERE created_by = p_buying_group_id
        )
    );
    
    -- Get the number of rows updated
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'All activities marked as read',
        'updatedCount', v_updated_count,
        'markedAt', NOW()
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_all_admin_activities_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_admin_activities_read(UUID) TO service_role;

-- ============================================================
-- RPC Function: mark_admin_activity_read
-- Marks a single activity as read (with buying group access check)
-- ============================================================

DROP FUNCTION IF EXISTS mark_admin_activity_read(UUID);
DROP FUNCTION IF EXISTS mark_admin_activity_read(UUID, UUID);

CREATE OR REPLACE FUNCTION mark_admin_activity_read(
    p_activity_id UUID,
    p_buying_group_id UUID DEFAULT NULL -- Scope check (null = MainAdmin, can access all)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pharmacy_created_by UUID;
    v_activity_exists BOOLEAN;
BEGIN
    -- Find the activity and verify buying group access
    SELECT p.created_by, TRUE
    INTO v_pharmacy_created_by, v_activity_exists
    FROM admin_recent_activity a
    INNER JOIN pharmacy p ON a.pharmacy_id = p.id
    WHERE a.id = p_activity_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Activity not found'
        );
    END IF;

    -- Check buying group access (MainAdmin with p_buying_group_id=NULL can access all)
    IF p_buying_group_id IS NOT NULL AND v_pharmacy_created_by <> p_buying_group_id THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Access denied'
        );
    END IF;
    
    -- Update activity to read
    UPDATE admin_recent_activity
    SET is_read = TRUE,
        read_at = NOW()
    WHERE id = p_activity_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Activity marked as read',
        'activityId', p_activity_id,
        'markedAt', NOW()
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_admin_activity_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_admin_activity_read(UUID, UUID) TO service_role;

-- ============================================================
-- Example usage:
-- ============================================================
-- Get all recent activities (default 20, no filters):
-- SELECT get_admin_recent_activity();
--
-- Get only document uploads:
-- SELECT get_admin_recent_activity('document_uploaded');
--
-- Get only product additions:
-- SELECT get_admin_recent_activity('product_added');
--
-- Get only pharmacy registrations:
-- SELECT get_admin_recent_activity('pharmacy_registered');
--
-- Get with pagination (page 2, 10 items per page):
-- SELECT get_admin_recent_activity(NULL, 10, 10);
--
-- Get activities for specific pharmacy:
-- SELECT get_admin_recent_activity(NULL, 20, 0, '3e19f01d-511d-421f-9cc6-ed83d33e034d'::UUID);
--
-- Get document uploads for specific pharmacy:
-- SELECT get_admin_recent_activity('document_uploaded', 20, 0, '3e19f01d-511d-421f-9cc6-ed83d33e034d'::UUID);
--
-- Scoped to buying group:
-- SELECT get_admin_recent_activity(NULL, 20, 0, NULL, '29f984d2-c0ac-4bed-9358-e3a41e4634a6'::UUID);
-- ============================================================

