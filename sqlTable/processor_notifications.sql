-- ============================================================================
-- PROCESSOR NOTIFICATIONS
-- ----------------------------------------------------------------------------
-- Dedicated, per-processor notification stream.
--
-- Why a separate table (vs reusing admin_recent_activity)?
--   * admin_recent_activity is scoped to buying_group, so every admin in the
--     group can see every record. Processors must NEVER see each other's
--     feeds — they only care about items that involve them directly.
--   * Events are processor-specific (new service request assignment,
--     pharmacy cancellation of a claimed request, admin reassignment, etc.)
--     and are not part of the pharmacy-level activity log.
--
-- Events written today:
--   * service_request_new         -> pharmacy created a request; processor
--                                    was auto-assigned to the pool.
--   * service_request_cancelled   -> pharmacy cancelled the request; only
--                                    notify processors who were assigned
--                                    (and the claimant specifically).
--   * service_request_reassigned  -> admin reassigned the request; notify
--                                    the newly-assigned processors.
--
-- Consumed by the admin-portal top-right bell when the logged-in user's
-- role = 'processor'. (Admins/super-admins continue to use
-- admin_recent_activity.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS processor_notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processor_id  UUID NOT NULL REFERENCES processors(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    entity_type   TEXT,
    entity_id     UUID,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proc_notif_processor_id
    ON processor_notifications(processor_id);
CREATE INDEX IF NOT EXISTS idx_proc_notif_created_at
    ON processor_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proc_notif_unread
    ON processor_notifications(processor_id, is_read)
    WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_proc_notif_entity
    ON processor_notifications(entity_type, entity_id);

ALTER TABLE processor_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS processor_notifications_service_role_all
    ON processor_notifications;
CREATE POLICY processor_notifications_service_role_all
    ON processor_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON processor_notifications TO authenticated;
GRANT ALL ON processor_notifications TO service_role;


-- ============================================================================
-- RPC: list_processor_notifications
-- ----------------------------------------------------------------------------
-- Returns the processor's own notifications, newest first, with pagination
-- and an unread_count summary.
-- ============================================================================

CREATE OR REPLACE FUNCTION list_processor_notifications(
    p_processor_id UUID,
    p_limit        INTEGER,
    p_offset       INTEGER,
    p_only_unread  BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_limit         INTEGER := COALESCE(NULLIF(p_limit, 0), 20);
    v_offset        INTEGER := COALESCE(p_offset, 0);
    v_total         INTEGER;
    v_unread_count  INTEGER;
    v_items         JSONB;
BEGIN
    IF p_processor_id IS NULL THEN
        RAISE EXCEPTION 'processor_id is required' USING ERRCODE = '22023';
    END IF;

    IF v_limit < 1  THEN v_limit  := 1;   END IF;
    IF v_limit > 100 THEN v_limit := 100; END IF;
    IF v_offset < 0 THEN v_offset := 0;   END IF;

    SELECT COUNT(*) INTO v_total
    FROM processor_notifications pn
    WHERE pn.processor_id = p_processor_id
      AND (NOT COALESCE(p_only_unread, FALSE) OR pn.is_read = FALSE);

    SELECT COUNT(*) INTO v_unread_count
    FROM processor_notifications pn
    WHERE pn.processor_id = p_processor_id
      AND pn.is_read = FALSE;

    SELECT COALESCE(jsonb_agg(row), '[]'::jsonb) INTO v_items
    FROM (
        SELECT jsonb_build_object(
                   'id',          pn.id,
                   'type',        pn.type,
                   'title',       pn.title,
                   'message',     pn.message,
                   'entity_type', pn.entity_type,
                   'entity_id',   pn.entity_id,
                   'metadata',    pn.metadata,
                   'is_read',     pn.is_read,
                   'read_at',     pn.read_at,
                   'created_at',  pn.created_at
               ) AS row
        FROM processor_notifications pn
        WHERE pn.processor_id = p_processor_id
          AND (NOT COALESCE(p_only_unread, FALSE) OR pn.is_read = FALSE)
        ORDER BY pn.created_at DESC
        LIMIT v_limit OFFSET v_offset
    ) sub;

    RETURN jsonb_build_object(
        'notifications', v_items,
        'pagination', jsonb_build_object(
            'total',    v_total,
            'limit',    v_limit,
            'offset',   v_offset,
            'has_more', v_offset + v_limit < v_total
        ),
        'unread_count', v_unread_count
    );
END;
$$;


-- ============================================================================
-- RPC: mark_processor_notification_read
-- ----------------------------------------------------------------------------
-- Marks a single notification as read. Processor can only mark their own.
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_processor_notification_read(
    p_notification_id UUID,
    p_processor_id    UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_notification_id IS NULL OR p_processor_id IS NULL THEN
        RAISE EXCEPTION 'notification_id and processor_id are required'
            USING ERRCODE = '22023';
    END IF;

    UPDATE processor_notifications
       SET is_read = TRUE,
           read_at = NOW()
     WHERE id = p_notification_id
       AND processor_id = p_processor_id
       AND is_read = FALSE;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'success',       v_updated > 0,
        'updated_count', v_updated
    );
END;
$$;


-- ============================================================================
-- RPC: mark_all_processor_notifications_read
-- ----------------------------------------------------------------------------
-- Bulk-marks every unread notification for this processor as read.
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_all_processor_notifications_read(
    p_processor_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_processor_id IS NULL THEN
        RAISE EXCEPTION 'processor_id is required' USING ERRCODE = '22023';
    END IF;

    UPDATE processor_notifications
       SET is_read = TRUE,
           read_at = NOW()
     WHERE processor_id = p_processor_id
       AND is_read = FALSE;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'success',       TRUE,
        'updated_count', v_updated
    );
END;
$$;


-- ============================================================================
-- Helper: internal insert function (SECURITY DEFINER so it can be called
-- from inside other RPCs without needing direct INSERT grants).
-- ============================================================================

CREATE OR REPLACE FUNCTION create_processor_notification(
    p_processor_id UUID,
    p_type         TEXT,
    p_title        TEXT,
    p_message      TEXT,
    p_entity_type  TEXT,
    p_entity_id    UUID,
    p_metadata     JSONB
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_processor_id IS NULL OR p_type IS NULL
       OR p_title IS NULL OR p_message IS NULL THEN
        RAISE EXCEPTION 'processor_id, type, title and message are required'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO processor_notifications (
        processor_id, type, title, message,
        entity_type, entity_id, metadata
    ) VALUES (
        p_processor_id, p_type, p_title, p_message,
        p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
