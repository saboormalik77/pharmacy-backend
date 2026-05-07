-- ============================================================
-- MIGRATION: Add read status to admin_recent_activity
-- ============================================================
-- This script adds read/unread functionality to admin notifications
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add is_read column to admin_recent_activity table
ALTER TABLE public.admin_recent_activity 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Add read_at timestamp column
ALTER TABLE public.admin_recent_activity 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient filtering by read status
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_is_read 
  ON public.admin_recent_activity USING btree (is_read) TABLESPACE pg_default;

-- ============================================================
-- Update get_admin_recent_activity function to include isRead
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID);

CREATE OR REPLACE FUNCTION get_admin_recent_activity(
    p_activity_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_pharmacy_id UUID DEFAULT NULL
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
    -- Get total count (with filters)
    SELECT COUNT(*)::INTEGER
    INTO v_total_count
    FROM admin_recent_activity a
    WHERE (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id);

    -- Get today's activity count
    SELECT COUNT(*)::INTEGER
    INTO v_today_count
    FROM admin_recent_activity a
    WHERE a.created_at >= DATE_TRUNC('day', NOW())
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id);

    -- Get this week's activity count
    SELECT COUNT(*)::INTEGER
    INTO v_this_week_count
    FROM admin_recent_activity a
    WHERE a.created_at >= DATE_TRUNC('week', NOW())
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id);

    -- Get unread count
    SELECT COUNT(*)::INTEGER
    INTO v_unread_count
    FROM admin_recent_activity a
    WHERE COALESCE(a.is_read, FALSE) = FALSE
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id);

    -- Get activities with pharmacy info (including isRead)
    SELECT COALESCE(jsonb_agg(activity_data ORDER BY activity_data->>'createdAt' DESC), '[]'::JSONB)
    INTO v_activities
    FROM (
        SELECT jsonb_build_object(
            'id', a.id,
            'activityType', a.activity_type,
            'entityId', a.entity_id,
            'entityName', a.entity_name,
            'metadata', a.metadata,
            'createdAt', a.created_at,
            'isRead', COALESCE(a.is_read, FALSE),
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
        ORDER BY a.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) sub;

    -- Build final result
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
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID) TO service_role;

-- ============================================================
-- Create function to mark all activities as read
-- ============================================================

DROP FUNCTION IF EXISTS mark_all_admin_activities_read();

CREATE OR REPLACE FUNCTION mark_all_admin_activities_read()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update all unread activities to read
    UPDATE admin_recent_activity
    SET is_read = TRUE,
        read_at = NOW()
    WHERE is_read = FALSE OR is_read IS NULL;
    
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
GRANT EXECUTE ON FUNCTION mark_all_admin_activities_read() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_admin_activities_read() TO service_role;

-- ============================================================
-- Create function to mark a single activity as read
-- ============================================================

DROP FUNCTION IF EXISTS mark_admin_activity_read(UUID);

CREATE OR REPLACE FUNCTION mark_admin_activity_read(p_activity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activity admin_recent_activity%ROWTYPE;
BEGIN
    -- Find the activity
    SELECT * INTO v_activity
    FROM admin_recent_activity
    WHERE id = p_activity_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Activity not found'
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
GRANT EXECUTE ON FUNCTION mark_admin_activity_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_admin_activity_read(UUID) TO service_role;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT get_admin_recent_activity();
-- SELECT mark_all_admin_activities_read();

