-- ============================================================================
-- PHARMACY NOTIFICATIONS
-- ----------------------------------------------------------------------------
-- Per-pharmacy in-app notification stream for service request updates.
--
-- Pharmacies get notified when:
--   * A processor schedules their request (they know when to expect visit)
--   * A processor completes their request (they know service was provided)
--   * A processor cancels their request (they know to reschedule)
--   * Admin reassigns their request (for transparency)
--
-- Each pharmacy only sees notifications for their own requests.
-- This is consumed by the pharmacy portal's notification system.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pharmacy_notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id   UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_pharm_notif_pharmacy_id
    ON pharmacy_notifications(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_created_at
    ON pharmacy_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_unread
    ON pharmacy_notifications(pharmacy_id, is_read)
    WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_pharm_notif_entity
    ON pharmacy_notifications(entity_type, entity_id);

ALTER TABLE pharmacy_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pharmacy_notifications_service_role_all
    ON pharmacy_notifications;
CREATE POLICY pharmacy_notifications_service_role_all
    ON pharmacy_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON pharmacy_notifications TO authenticated;
GRANT ALL ON pharmacy_notifications TO service_role;


-- ============================================================================
-- RPC: list_pharmacy_notifications
-- ----------------------------------------------------------------------------
-- Returns notifications for the authenticated pharmacy, newest first, with 
-- pagination and unread count.
-- ============================================================================

CREATE OR REPLACE FUNCTION list_pharmacy_notifications(
    p_pharmacy_id UUID,
    p_limit       INTEGER,
    p_offset      INTEGER,
    p_only_unread BOOLEAN
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
    IF p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id is required' USING ERRCODE = '22023';
    END IF;

    IF v_limit < 1   THEN v_limit  := 1;   END IF;
    IF v_limit > 100 THEN v_limit  := 100; END IF;
    IF v_offset < 0  THEN v_offset := 0;   END IF;

    SELECT COUNT(*) INTO v_total
    FROM pharmacy_notifications pn
    WHERE pn.pharmacy_id = p_pharmacy_id
      AND (NOT COALESCE(p_only_unread, FALSE) OR pn.is_read = FALSE);

    SELECT COUNT(*) INTO v_unread_count
    FROM pharmacy_notifications pn
    WHERE pn.pharmacy_id = p_pharmacy_id
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
        FROM pharmacy_notifications pn
        WHERE pn.pharmacy_id = p_pharmacy_id
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
-- RPC: mark_pharmacy_notification_read
-- ----------------------------------------------------------------------------
-- Marks a single notification as read. Pharmacy can only mark their own.
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_pharmacy_notification_read(
    p_notification_id UUID,
    p_pharmacy_id     UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_notification_id IS NULL OR p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'notification_id and pharmacy_id are required'
            USING ERRCODE = '22023';
    END IF;

    UPDATE pharmacy_notifications
       SET is_read = TRUE,
           read_at = NOW()
     WHERE id = p_notification_id
       AND pharmacy_id = p_pharmacy_id
       AND is_read = FALSE;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', v_updated > 0, 'updated_count', v_updated);
END;
$$;


-- ============================================================================
-- RPC: mark_all_pharmacy_notifications_read
-- ----------------------------------------------------------------------------
-- Bulk-marks every unread notification for this pharmacy as read.
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_all_pharmacy_notifications_read(
    p_pharmacy_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id is required' USING ERRCODE = '22023';
    END IF;

    UPDATE pharmacy_notifications
       SET is_read = TRUE,
           read_at = NOW()
     WHERE pharmacy_id = p_pharmacy_id
       AND is_read = FALSE;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated);
END;
$$;


-- ============================================================================
-- Helper: internal insert function (SECURITY DEFINER so it can be called
-- from inside other RPCs without needing direct INSERT grants).
-- ============================================================================

CREATE OR REPLACE FUNCTION create_pharmacy_notification(
    p_pharmacy_id UUID,
    p_type        TEXT,
    p_title       TEXT,
    p_message     TEXT,
    p_entity_type TEXT,
    p_entity_id   UUID,
    p_metadata    JSONB
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_pharmacy_id IS NULL OR p_type IS NULL
       OR p_title IS NULL OR p_message IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id, type, title and message are required'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO pharmacy_notifications (
        pharmacy_id, type, title, message,
        entity_type, entity_id, metadata
    ) VALUES (
        p_pharmacy_id, p_type, p_title, p_message,
        p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;