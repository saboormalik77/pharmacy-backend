-- ============================================================================
-- PATCH: Service requests — notifications + column/schema fixes
-- ============================================================================
-- Run this in Supabase SQL Editor. All statements are idempotent
-- (CREATE IF NOT EXISTS / CREATE OR REPLACE) so re-running is safe.
--
-- What this patch does:
--   1. (schema)  Fixes list_* / get_service_request_detail RPCs to use
--                pharmacy.name / pharmacy.pharmacy_name (the real columns) —
--                the column `business_name` does NOT exist.
--   2. (schema)  Removes UPDATE of processor_store_assignments.next_visit_date
--                and .last_visit_date from claim_service_request — those
--                columns do not exist on that table.
--   3. (feature) Adds `processor_notifications` table + 4 RPCs for a
--                per-processor in-app notifications feed.
--   4. (feature) Adds `pharmacy_notifications` table + 4 RPCs for a
--                per-pharmacy in-app notifications feed.
--   5. (fix)     Updates create_service_request to include pharmacy details
--                in response for email notifications.
--   6. (wire-up) Hooks INSERTs into processor_notifications from:
--                  create_service_request         -> notify all eligible reps
--                  cancel_pharmacy_service_request-> notify all assigned reps
--                  admin_reassign_service_request -> notify the new reps
--   7. (wire-up) Hooks INSERTs into pharmacy_notifications from:
--                  claim_service_request (schedule/complete/cancel actions)
-- ============================================================================


-- ============================================================================
-- SECTION 1 — processor_notifications table + RPCs
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

-- Add missing columns if they don't exist (in case table was partially created)
DO $$
BEGIN
    -- Add entity_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processor_notifications' 
        AND column_name = 'entity_type'
    ) THEN
        ALTER TABLE processor_notifications ADD COLUMN entity_type TEXT;
    END IF;
    
    -- Add entity_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processor_notifications' 
        AND column_name = 'entity_id'
    ) THEN
        ALTER TABLE processor_notifications ADD COLUMN entity_id UUID;
    END IF;
    
    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processor_notifications' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE processor_notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add is_read column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processor_notifications' 
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE processor_notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    -- Add read_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processor_notifications' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE processor_notifications ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proc_notif_processor_id
    ON processor_notifications(processor_id);
CREATE INDEX IF NOT EXISTS idx_proc_notif_created_at
    ON processor_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proc_notif_entity
    ON processor_notifications(entity_type, entity_id);

-- Create partial index for unread notifications (done separately to avoid timing issues)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'processor_notifications' 
        AND indexname = 'idx_proc_notif_unread'
    ) THEN
        CREATE INDEX idx_proc_notif_unread
        ON processor_notifications(processor_id, is_read)
        WHERE is_read = false;
    END IF;
END $$;

ALTER TABLE processor_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS processor_notifications_service_role_all
    ON processor_notifications;
CREATE POLICY processor_notifications_service_role_all
    ON processor_notifications FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON processor_notifications TO authenticated;
GRANT ALL ON processor_notifications TO service_role;


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

    IF v_limit < 1   THEN v_limit  := 1;   END IF;
    IF v_limit > 100 THEN v_limit  := 100; END IF;
    IF v_offset < 0  THEN v_offset := 0;   END IF;

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

    RETURN jsonb_build_object('success', v_updated > 0, 'updated_count', v_updated);
END;
$$;


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

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated);
END;
$$;


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


-- ============================================================================
-- SECTION 2 — pharmacy_notifications table + RPCs
-- ============================================================================

-- Create pharmacy_notifications table
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

-- Add missing columns if they don't exist (in case table was partially created)
DO $$
BEGIN
    -- Add entity_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_notifications' 
        AND column_name = 'entity_type'
    ) THEN
        ALTER TABLE pharmacy_notifications ADD COLUMN entity_type TEXT;
    END IF;
    
    -- Add entity_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_notifications' 
        AND column_name = 'entity_id'
    ) THEN
        ALTER TABLE pharmacy_notifications ADD COLUMN entity_id UUID;
    END IF;
    
    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_notifications' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE pharmacy_notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add is_read column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_notifications' 
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE pharmacy_notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    -- Add read_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_notifications' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE pharmacy_notifications ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pharm_notif_pharmacy_id
    ON pharmacy_notifications(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_created_at
    ON pharmacy_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_entity
    ON pharmacy_notifications(entity_type, entity_id);

-- Create partial index for unread notifications (done separately to avoid timing issues)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'pharmacy_notifications' 
        AND indexname = 'idx_pharm_notif_unread'
    ) THEN
        CREATE INDEX idx_pharm_notif_unread
        ON pharmacy_notifications(pharmacy_id, is_read)
        WHERE is_read = false;
    END IF;
END $$;

ALTER TABLE pharmacy_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pharmacy_notifications_service_role_all
    ON pharmacy_notifications;
CREATE POLICY pharmacy_notifications_service_role_all
    ON pharmacy_notifications FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON pharmacy_notifications TO authenticated;
GRANT ALL ON pharmacy_notifications TO service_role;


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


-- ============================================================================
-- SECTION 3 — create_service_request (adds notifications insert + pharmacy details in response)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_service_request(
    p_pharmacy_id          UUID,
    p_branch_id            UUID,
    p_requested_date       DATE,
    p_purpose              TEXT,
    p_special_instructions TEXT,
    p_requested_by_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_request_id             UUID;
    v_effective_pharmacy_id  UUID;
    v_buying_group_id        UUID;
    v_parent_id              UUID;
    v_assigned_count         INTEGER := 0;
    v_request_row            JSONB;
    v_assigned_processors    JSONB;
BEGIN
    IF p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id is required' USING ERRCODE = '22023';
    END IF;
    IF p_requested_date IS NULL THEN
        RAISE EXCEPTION 'requested_date is required' USING ERRCODE = '22023';
    END IF;
    IF p_requested_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'requested_date cannot be in the past' USING ERRCODE = '22023';
    END IF;
    IF p_purpose IS NULL OR p_purpose NOT IN
       ('return_pickup','training','inventory_review','destruction_pickup','other') THEN
        RAISE EXCEPTION 'Invalid purpose value' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(LENGTH(p_special_instructions), 0) > 2000 THEN
        RAISE EXCEPTION 'special_instructions cannot exceed 2000 characters' USING ERRCODE = '22023';
    END IF;

    v_effective_pharmacy_id := COALESCE(p_branch_id, p_pharmacy_id);

    BEGIN
        SELECT buying_group_id, parent_pharmacy_id
          INTO v_buying_group_id, v_parent_id
        FROM pharmacy
        WHERE id = v_effective_pharmacy_id;
    EXCEPTION WHEN OTHERS THEN
        v_buying_group_id := NULL;
        v_parent_id := NULL;
    END;

    INSERT INTO service_requests (
        pharmacy_id, branch_id, requested_by_user_id, buying_group_id,
        requested_date, purpose, special_instructions, status
    ) VALUES (
        p_pharmacy_id, p_branch_id, p_requested_by_user_id, v_buying_group_id,
        p_requested_date, p_purpose, NULLIF(TRIM(COALESCE(p_special_instructions, '')), ''),
        'pending'
    )
    RETURNING id INTO v_request_id;

    INSERT INTO service_request_assignments (service_request_id, processor_id)
    SELECT DISTINCT v_request_id, psa.processor_id
    FROM processor_store_assignments psa
    JOIN processors p ON p.id = psa.processor_id
    WHERE psa.pharmacy_id IN (
            v_effective_pharmacy_id,
            COALESCE(v_parent_id, v_effective_pharmacy_id)
          )
      AND p.status = 'active'
    ON CONFLICT (service_request_id, processor_id) DO NOTHING;

    GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

    -- Per-processor in-app notification for every eligible rep
    BEGIN
        INSERT INTO processor_notifications (
            processor_id, type, title, message,
            entity_type, entity_id, metadata
        )
        SELECT
            sra.processor_id,
            'service_request_new',
            'New on-site service request',
            COALESCE(ph.pharmacy_name, ph.name, 'A pharmacy')
                || ' requested an on-site visit for '
                || to_char(p_requested_date, 'Mon DD, YYYY')
                || ' (' || INITCAP(REPLACE(p_purpose, '_', ' ')) || ')',
            'service_request',
            v_request_id,
            jsonb_build_object(
                'pharmacy_id',    p_pharmacy_id,
                'branch_id',      p_branch_id,
                'purpose',        p_purpose,
                'requested_date', p_requested_date,
                'pharmacy_name',  COALESCE(ph.pharmacy_name, ph.name)
            )
        FROM service_request_assignments sra
        LEFT JOIN pharmacy ph ON ph.id = v_effective_pharmacy_id
        WHERE sra.service_request_id = v_request_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    -- Include pharmacy details in the response for email notifications
    SELECT 
        to_jsonb(sr.*) || jsonb_build_object(
            'pharmacy_name',     ph.pharmacy_name,
            'pharmacy_business_name', ph.name,
            'pharmacy_email',    ph.email,
            'pharmacy_phone',    ph.phone,
            'pharmacy_address',  ph.address
        ) INTO v_request_row
    FROM service_requests sr
    LEFT JOIN pharmacy ph ON ph.id = sr.pharmacy_id
    WHERE sr.id = v_request_id;

    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'processor_id', p.id,
            'name',         p.name,
            'email',        p.email,
            'phone',        p.phone
        )),
        '[]'::jsonb
    )
    INTO v_assigned_processors
    FROM service_request_assignments sra
    JOIN processors p ON p.id = sra.processor_id
    WHERE sra.service_request_id = v_request_id;

    RETURN v_request_row
        || jsonb_build_object(
            'assigned_processors', v_assigned_processors,
            'assigned_count',      v_assigned_count
        );
END;
$$;


-- ============================================================================
-- SECTION 4 — cancel_pharmacy_service_request (adds notifications insert)
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_pharmacy_service_request(
    p_request_id  UUID,
    p_pharmacy_id UUID,
    p_reason      TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status
    FROM service_requests
    WHERE id = p_request_id
      AND (pharmacy_id = p_pharmacy_id OR branch_id = p_pharmacy_id)
    FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Service request not found or access denied' USING ERRCODE = '02000';
    END IF;

    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending requests can be cancelled' USING ERRCODE = '55000';
    END IF;

    UPDATE service_requests SET
        status           = 'cancelled',
        cancelled_at     = NOW(),
        cancelled_reason = NULLIF(TRIM(COALESCE(p_reason, '')), ''),
        cancelled_by     = 'pharmacy',
        cancelled_by_id  = p_pharmacy_id
    WHERE id = p_request_id;

    BEGIN
        INSERT INTO processor_notifications (
            processor_id, type, title, message,
            entity_type, entity_id, metadata
        )
        SELECT
            sra.processor_id,
            'service_request_cancelled',
            'Service request cancelled',
            COALESCE(ph.pharmacy_name, ph.name, 'The pharmacy')
                || ' cancelled their on-site service request.',
            'service_request',
            p_request_id,
            jsonb_build_object(
                'pharmacy_id',    p_pharmacy_id,
                'cancelled_by',   'pharmacy',
                'reason',         NULLIF(TRIM(COALESCE(p_reason, '')), ''),
                'pharmacy_name',  COALESCE(ph.pharmacy_name, ph.name)
            )
        FROM service_request_assignments sra
        LEFT JOIN service_requests sr ON sr.id = p_request_id
        LEFT JOIN pharmacy ph ON ph.id = COALESCE(sr.branch_id, sr.pharmacy_id)
        WHERE sra.service_request_id = p_request_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    RETURN (SELECT to_jsonb(sr.*) FROM service_requests sr WHERE sr.id = p_request_id);
END;
$$;


-- ============================================================================
-- SECTION 5 — claim_service_request (drops non-existent column UPDATEs + adds pharmacy notifications)
-- ============================================================================
-- FIX: processor_store_assignments does NOT have next_visit_date or
-- last_visit_date columns, so the UPDATEs inside the schedule/complete
-- branches were blowing up with 42703.
-- FEATURE: adds pharmacy notifications for schedule/complete/cancel actions.

CREATE OR REPLACE FUNCTION claim_service_request(
    p_request_id     UUID,
    p_processor_id   UUID,
    p_action         TEXT,
    p_scheduled_date DATE,
    p_notes          TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_request     service_requests%ROWTYPE;
    v_is_eligible BOOLEAN;
BEGIN
    IF p_action NOT IN ('schedule','complete','cancel','release') THEN
        RAISE EXCEPTION 'Invalid action: %', p_action USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_request
    FROM service_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found' USING ERRCODE = '02000';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM service_request_assignments
        WHERE service_request_id = p_request_id
          AND processor_id = p_processor_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'You are not assigned to this service request' USING ERRCODE = '42501';
    END IF;

    IF v_request.claimed_by_processor_id IS NOT NULL
       AND v_request.claimed_by_processor_id <> p_processor_id THEN
        RAISE EXCEPTION 'This request has already been claimed by another processor'
            USING ERRCODE = '55000';
    END IF;

    IF p_action = 'schedule' THEN
        IF v_request.status NOT IN ('pending','scheduled') THEN
            RAISE EXCEPTION 'Cannot schedule a request with status: %', v_request.status
                USING ERRCODE = '55000';
        END IF;
        IF p_scheduled_date IS NULL THEN
            RAISE EXCEPTION 'scheduled_date is required for schedule action'
                USING ERRCODE = '22023';
        END IF;

        UPDATE service_requests SET
            claimed_by_processor_id = p_processor_id,
            claimed_at              = COALESCE(claimed_at, NOW()),
            status                  = 'scheduled',
            scheduled_date          = p_scheduled_date,
            scheduler_notes         = NULLIF(TRIM(COALESCE(p_notes, '')), '')
        WHERE id = p_request_id;

        -- Notify pharmacy that their request has been scheduled
        BEGIN
            INSERT INTO pharmacy_notifications (
                pharmacy_id, type, title, message,
                entity_type, entity_id, metadata
            )
            SELECT
                v_request.pharmacy_id,
                'service_request_scheduled',
                'Service request scheduled',
                'Your on-site service request has been scheduled for '
                    || to_char(p_scheduled_date, 'Mon DD, YYYY')
                    || CASE WHEN pr.name IS NOT NULL THEN ' by ' || pr.name ELSE '' END
                    || '.',
                'service_request',
                p_request_id,
                jsonb_build_object(
                    'processor_id',   p_processor_id,
                    'processor_name', pr.name,
                    'scheduled_date', p_scheduled_date,
                    'purpose',        v_request.purpose,
                    'notes',          NULLIF(TRIM(COALESCE(p_notes, '')), '')
                )
            FROM processors pr
            WHERE pr.id = p_processor_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

    ELSIF p_action = 'complete' THEN
        IF v_request.status <> 'scheduled' THEN
            RAISE EXCEPTION 'Only scheduled requests can be completed'
                USING ERRCODE = '55000';
        END IF;
        IF v_request.claimed_by_processor_id IS NULL
           OR v_request.claimed_by_processor_id <> p_processor_id THEN
            RAISE EXCEPTION 'Only the claiming processor can complete this request'
                USING ERRCODE = '42501';
        END IF;

        UPDATE service_requests SET
            status           = 'completed',
            completed_at     = NOW(),
            completion_notes = NULLIF(TRIM(COALESCE(p_notes, '')), '')
        WHERE id = p_request_id;

        -- Notify pharmacy that their request has been completed
        BEGIN
            INSERT INTO pharmacy_notifications (
                pharmacy_id, type, title, message,
                entity_type, entity_id, metadata
            )
            SELECT
                v_request.pharmacy_id,
                'service_request_completed',
                'Service request completed',
                'Your on-site service request has been completed'
                    || CASE WHEN pr.name IS NOT NULL THEN ' by ' || pr.name ELSE '' END
                    || '.',
                'service_request',
                p_request_id,
                jsonb_build_object(
                    'processor_id',   p_processor_id,
                    'processor_name', pr.name,
                    'completed_at',   NOW(),
                    'purpose',        v_request.purpose,
                    'notes',          NULLIF(TRIM(COALESCE(p_notes, '')), '')
                )
            FROM processors pr
            WHERE pr.id = p_processor_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

    ELSIF p_action = 'cancel' THEN
        IF v_request.status IN ('completed','cancelled') THEN
            RAISE EXCEPTION 'Cannot cancel a % request', v_request.status
                USING ERRCODE = '55000';
        END IF;

        UPDATE service_requests SET
            status           = 'cancelled',
            cancelled_at     = NOW(),
            cancelled_reason = NULLIF(TRIM(COALESCE(p_notes, '')), ''),
            cancelled_by     = 'processor',
            cancelled_by_id  = p_processor_id
        WHERE id = p_request_id;

        -- Notify pharmacy that their request has been cancelled by processor
        BEGIN
            INSERT INTO pharmacy_notifications (
                pharmacy_id, type, title, message,
                entity_type, entity_id, metadata
            )
            SELECT
                v_request.pharmacy_id,
                'service_request_cancelled',
                'Service request cancelled',
                'Your on-site service request has been cancelled'
                    || CASE WHEN pr.name IS NOT NULL THEN ' by ' || pr.name ELSE ' by your field representative' END
                    || CASE WHEN NULLIF(TRIM(COALESCE(p_notes, '')), '') IS NOT NULL 
                           THEN '. Reason: ' || TRIM(COALESCE(p_notes, '')) 
                           ELSE '.' END,
                'service_request',
                p_request_id,
                jsonb_build_object(
                    'processor_id',     p_processor_id,
                    'processor_name',   pr.name,
                    'cancelled_at',     NOW(),
                    'cancelled_by',     'processor',
                    'purpose',          v_request.purpose,
                    'reason',           NULLIF(TRIM(COALESCE(p_notes, '')), '')
                )
            FROM processors pr
            WHERE pr.id = p_processor_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

    ELSIF p_action = 'release' THEN
        IF v_request.status <> 'scheduled' THEN
            RAISE EXCEPTION 'Only scheduled requests can be released'
                USING ERRCODE = '55000';
        END IF;
        IF v_request.claimed_by_processor_id IS NULL
           OR v_request.claimed_by_processor_id <> p_processor_id THEN
            RAISE EXCEPTION 'Only the claiming processor can release this request'
                USING ERRCODE = '42501';
        END IF;

        UPDATE service_requests SET
            status                  = 'pending',
            claimed_by_processor_id = NULL,
            claimed_at              = NULL,
            scheduled_date          = NULL,
            scheduler_notes         = NULL
        WHERE id = p_request_id;
    END IF;

    RETURN (SELECT to_jsonb(sr.*) FROM service_requests sr WHERE sr.id = p_request_id);
END;
$$;


-- ============================================================================
-- SECTION 6 — admin_reassign_service_request (adds notifications insert)
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_reassign_service_request(
    p_request_id    UUID,
    p_processor_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_request          service_requests%ROWTYPE;
    v_added_processors JSONB;
BEGIN
    SELECT * INTO v_request FROM service_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found' USING ERRCODE = '02000';
    END IF;

    IF v_request.status IN ('completed','cancelled') THEN
        RAISE EXCEPTION 'Cannot reassign a % request', v_request.status USING ERRCODE = '55000';
    END IF;

    UPDATE service_requests SET
        claimed_by_processor_id = NULL,
        claimed_at              = NULL,
        status                  = 'pending',
        scheduled_date          = NULL,
        scheduler_notes         = NULL
    WHERE id = p_request_id;

    DELETE FROM service_request_assignments WHERE service_request_id = p_request_id;

    IF p_processor_ids IS NOT NULL AND array_length(p_processor_ids, 1) > 0 THEN
        INSERT INTO service_request_assignments (service_request_id, processor_id)
        SELECT p_request_id, pid
        FROM unnest(p_processor_ids) pid
        JOIN processors p ON p.id = pid
        WHERE p.status = 'active'
        ON CONFLICT (service_request_id, processor_id) DO NOTHING;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'processor_id', p.id,
        'name',         p.name,
        'email',        p.email,
        'phone',        p.phone
    )), '[]'::jsonb)
    INTO v_added_processors
    FROM service_request_assignments sra
    JOIN processors p ON p.id = sra.processor_id
    WHERE sra.service_request_id = p_request_id;

    BEGIN
        INSERT INTO processor_notifications (
            processor_id, type, title, message,
            entity_type, entity_id, metadata
        )
        SELECT
            sra.processor_id,
            'service_request_reassigned',
            'Service request reassigned to you',
            'An admin reassigned an on-site service request to you'
                || COALESCE(' for ' || ph.pharmacy_name, ' for ' || ph.name, '')
                || '.',
            'service_request',
            p_request_id,
            jsonb_build_object(
                'pharmacy_id',    v_request.pharmacy_id,
                'branch_id',      v_request.branch_id,
                'purpose',        v_request.purpose,
                'requested_date', v_request.requested_date,
                'pharmacy_name',  COALESCE(ph.pharmacy_name, ph.name)
            )
        FROM service_request_assignments sra
        LEFT JOIN pharmacy ph ON ph.id = COALESCE(v_request.branch_id, v_request.pharmacy_id)
        WHERE sra.service_request_id = p_request_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    RETURN (SELECT to_jsonb(sr.*) FROM service_requests sr WHERE sr.id = p_request_id)
           || jsonb_build_object('assigned_processors', v_added_processors);
END;
$$;

-- ============================================================================
-- DONE. Redeploy the edge function after running this patch:
--    ./setup_supabase_secrets.sh
--    ./deploy-edge-functions-simple.sh
-- (the edge function had a `nodemailer.createTransporter` typo that is now
--  fixed to `createTransport` — without redeploy, emails will keep failing.)
-- ============================================================================
