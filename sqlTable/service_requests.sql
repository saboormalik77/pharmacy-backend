-- ============================================================================
-- SERVICE REQUESTS (On-Site Service / Field Rep Visit Scheduling)
-- ----------------------------------------------------------------------------
-- Tables:
--   * service_requests              -> the request itself
--   * service_request_assignments   -> processors eligible to claim/act on it
--
-- RPCs (ALL business logic lives here):
--   * create_service_request         -> pharmacy creates + auto-assigns processors
--   * list_pharmacy_service_requests -> pharmacy's own requests
--   * cancel_pharmacy_service_request
--   * list_processor_service_requests-> processor's visible queue (hides after claim)
--   * claim_service_request          -> atomic claim + schedule/complete/cancel/release
--   * list_admin_service_requests    -> admin oversight (all in buying group)
--   * admin_reassign_service_request -> admin reassigns to a specific processor pool
--   * get_service_request_detail     -> full detail (used by all portals)
--
-- Run against Supabase Postgres database. Idempotent (CREATE IF NOT EXISTS /
-- CREATE OR REPLACE) so it's safe to re-run after iteration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_requests (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id             UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
    branch_id               UUID REFERENCES pharmacy(id) ON DELETE SET NULL,
    requested_by_user_id    UUID,
    buying_group_id         UUID,
    requested_date          DATE NOT NULL,
    purpose                 TEXT
        CHECK (purpose IS NULL OR purpose IN ('return_pickup','training','inventory_review','destruction_pickup','other')),
    special_instructions    TEXT,
    status                  TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','scheduled','completed','cancelled')),
    scheduled_date          DATE,
    claimed_by_processor_id UUID REFERENCES processors(id) ON DELETE SET NULL,
    claimed_at              TIMESTAMPTZ,
    scheduler_notes         TEXT,
    completed_at            TIMESTAMPTZ,
    completion_notes        TEXT,
    cancelled_at            TIMESTAMPTZ,
    cancelled_reason        TEXT,
    cancelled_by            TEXT CHECK (cancelled_by IN ('pharmacy','processor','admin')),
    cancelled_by_id         UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_pharmacy_id     ON service_requests(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_branch_id       ON service_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status          ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_claimed_by      ON service_requests(claimed_by_processor_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at      ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_buying_group    ON service_requests(buying_group_id);

CREATE TABLE IF NOT EXISTS service_request_assignments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    processor_id       UUID NOT NULL REFERENCES processors(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_request_id, processor_id)
);

CREATE INDEX IF NOT EXISTS idx_sra_service_request_id ON service_request_assignments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_sra_processor_id       ON service_request_assignments(processor_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION service_requests_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON service_requests;
CREATE TRIGGER trg_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION service_requests_set_updated_at();


-- ============================================================================
-- 2. RPC: create_service_request
-- ----------------------------------------------------------------------------
-- Pharmacy creates a request. The function:
--   1. Validates inputs
--   2. Inserts the service_request row (status = 'pending')
--   3. Finds all ACTIVE processors assigned to the pharmacy (or its parent)
--      via processor_store_assignments
--   4. Creates a service_request_assignments row for each eligible processor
--   5. Returns the full request + list of assigned processors (with emails)
--      so the application can send notifications.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_service_request(
    p_pharmacy_id          UUID,
    p_requested_date       DATE,
    p_branch_id            UUID DEFAULT NULL,
    p_purpose              TEXT DEFAULT NULL,
    p_special_instructions TEXT DEFAULT NULL,
    p_requested_by_user_id UUID DEFAULT NULL
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
    -- ---- Validation -----------------------------------------------------
    IF p_pharmacy_id IS NULL THEN
        RAISE EXCEPTION 'pharmacy_id is required' USING ERRCODE = '22023';
    END IF;
    IF p_requested_date IS NULL THEN
        RAISE EXCEPTION 'requested_date is required' USING ERRCODE = '22023';
    END IF;
    IF p_requested_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'requested_date cannot be in the past' USING ERRCODE = '22023';
    END IF;
    -- Purpose is OPTIONAL: only validate if provided
    IF p_purpose IS NOT NULL AND p_purpose NOT IN
       ('return_pickup','training','inventory_review','destruction_pickup','other') THEN
        RAISE EXCEPTION 'Invalid purpose value' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(LENGTH(p_special_instructions), 0) > 2000 THEN
        RAISE EXCEPTION 'special_instructions cannot exceed 2000 characters' USING ERRCODE = '22023';
    END IF;

    -- Determine which pharmacy row we use to find processors:
    -- branch context if passed; otherwise the main pharmacy itself.
    v_effective_pharmacy_id := COALESCE(p_branch_id, p_pharmacy_id);

    -- Buying group id matches processors.buying_group_id -> admin(id); stored on pharmacy as created_by (not pharmacy.buying_group_id).
    SELECT
        COALESCE(ph.created_by, par.created_by),
        ph.parent_pharmacy_id
      INTO v_buying_group_id, v_parent_id
      FROM pharmacy ph
      LEFT JOIN pharmacy par ON par.id = ph.parent_pharmacy_id
     WHERE ph.id = v_effective_pharmacy_id;

    -- ---- Insert request -------------------------------------------------
    INSERT INTO service_requests (
        pharmacy_id, branch_id, requested_by_user_id, buying_group_id,
        requested_date, purpose, special_instructions, status
    ) VALUES (
        p_pharmacy_id, p_branch_id, p_requested_by_user_id, v_buying_group_id,
        p_requested_date, p_purpose, NULLIF(TRIM(COALESCE(p_special_instructions, '')), ''),
        'pending'
    )
    RETURNING id INTO v_request_id;

    -- ---- Auto-assign processors ----------------------------------------
    -- Any active processor assigned to the effective pharmacy OR its parent
    -- (so branch requests also reach parent-level processors) becomes eligible.
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

    -- ---- In-app notification for every assigned processor --------------
    -- Best-effort: wrapped in BEGIN/EXCEPTION so a missing processor_notifications
    -- table (e.g. stale migration) never blocks request creation.
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
                || CASE
                    WHEN p_purpose IS NOT NULL THEN ' (' || INITCAP(REPLACE(p_purpose, '_', ' ')) || ')'
                    ELSE ''
                END,
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
        NULL; -- processor_notifications table not installed yet
    END;

    -- ---- Build response -------------------------------------------------
    -- Include pharmacy details in the response for email notifications
    SELECT 
        to_jsonb(sr.*) || jsonb_build_object(
            'pharmacy_name',     ph.pharmacy_name,
            'pharmacy_business_name', ph.name,
            'pharmacy_email',    ph.email,
            'pharmacy_phone',    ph.phone,
            'pharmacy_address',  ph.physical_address
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
-- 3. RPC: list_pharmacy_service_requests
-- Returns the pharmacy's own requests (parent + any branch it owns).
-- ============================================================================

CREATE OR REPLACE FUNCTION list_pharmacy_service_requests(
    p_pharmacy_id   UUID,
    p_status_filter TEXT,
    p_page          INTEGER,
    p_limit         INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total  INTEGER;
    v_items  JSONB;
    v_limit  INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
    v_page   INTEGER := GREATEST(1, COALESCE(p_page, 1));
BEGIN
    v_offset := (v_page - 1) * v_limit;

    SELECT COUNT(*) INTO v_total
    FROM service_requests sr
    WHERE (sr.pharmacy_id = p_pharmacy_id OR sr.branch_id = p_pharmacy_id)
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter);

    SELECT COALESCE(jsonb_agg(item_row), '[]'::jsonb)
    INTO v_items
    FROM (
        SELECT
            sr.*,
            b.name AS branch_business_name,
            b.pharmacy_name AS branch_name,
            proc.name       AS claimed_processor_name,
            proc.email      AS claimed_processor_email,
            proc.phone      AS claimed_processor_phone
        FROM service_requests sr
        LEFT JOIN pharmacy   b    ON b.id   = sr.branch_id
        LEFT JOIN processors proc ON proc.id = sr.claimed_by_processor_id
        WHERE (sr.pharmacy_id = p_pharmacy_id OR sr.branch_id = p_pharmacy_id)
          AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
        ORDER BY sr.created_at DESC
        OFFSET v_offset
        LIMIT v_limit
    ) item_row;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'page',  v_page,
        'limit', v_limit
    );
END;
$$;


-- ============================================================================
-- 4. RPC: cancel_pharmacy_service_request
-- Pharmacy can cancel only pending requests they own.
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

    -- Notify every assigned processor that the pharmacy cancelled.
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
-- 5. RPC: list_processor_service_requests
-- The processor queue. A request is VISIBLE to processor P if:
--   * P is in service_request_assignments for this request, AND
--   * request is NOT yet claimed by anyone OR claimed by P themself
-- Once another processor claims it, it DISAPPEARS from this list (and from
-- that other processor's responses too, except for their own claim).
-- ============================================================================

CREATE OR REPLACE FUNCTION list_processor_service_requests(
    p_processor_id  UUID,
    p_status_filter TEXT,
    p_page          INTEGER,
    p_limit         INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total  INTEGER;
    v_items  JSONB;
    v_limit  INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
    v_page   INTEGER := GREATEST(1, COALESCE(p_page, 1));
BEGIN
    v_offset := (v_page - 1) * v_limit;

    SELECT COUNT(*) INTO v_total
    FROM service_requests sr
    JOIN service_request_assignments sra ON sra.service_request_id = sr.id
    WHERE sra.processor_id = p_processor_id
      AND (
          sr.claimed_by_processor_id IS NULL
          OR sr.claimed_by_processor_id = p_processor_id
      )
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter);

    SELECT COALESCE(jsonb_agg(item_row ORDER BY (item_row->>'created_at') DESC), '[]'::jsonb)
    INTO v_items
    FROM (
        SELECT to_jsonb(sr.*) || jsonb_build_object(
            'pharmacy_business_name', p.name,
            'pharmacy_name',          p.pharmacy_name,
            'pharmacy_phone',         p.phone,
            'pharmacy_email',         p.email,
            'branch_business_name',   b.name,
            'branch_name',            b.pharmacy_name,
            'is_claimed_by_me',       (sr.claimed_by_processor_id = p_processor_id)
        ) AS item_row
        FROM service_requests sr
        JOIN service_request_assignments sra ON sra.service_request_id = sr.id
        LEFT JOIN pharmacy p ON p.id = sr.pharmacy_id
        LEFT JOIN pharmacy b ON b.id = sr.branch_id
        WHERE sra.processor_id = p_processor_id
          AND (
              sr.claimed_by_processor_id IS NULL
              OR sr.claimed_by_processor_id = p_processor_id
          )
          AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
        ORDER BY sr.created_at DESC
        OFFSET v_offset
        LIMIT v_limit
    ) q;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'page',  v_page,
        'limit', v_limit
    );
END;
$$;


-- ============================================================================
-- 6. RPC: claim_service_request
-- Atomic claim + action by a processor.
--
--   p_action:
--     'schedule'  -> claim & set scheduled_date + notes (from pending)
--                    or update notes/date (while still claimed by me & scheduled)
--     'complete'  -> mark completed (must be scheduled & claimed by me)
--     'cancel'    -> processor cancels (any non-terminal status, claimed by me
--                    or unclaimed-but-eligible)
--     'release'   -> release back to pending (was scheduled & claimed by me)
--                    makes request visible to other assigned processors again.
--
-- Guarantees:
--   * Row-level FOR UPDATE lock prevents concurrent claims.
--   * If another processor has already claimed the request, every action
--     except 'release'-by-its-owner will fail with a 55000 error.
-- ============================================================================

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

    -- Row-level lock: holds until commit, blocks concurrent writes
    SELECT * INTO v_request
    FROM service_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found' USING ERRCODE = '02000';
    END IF;

    -- Eligibility: processor MUST be in the assignment list
    SELECT EXISTS (
        SELECT 1 FROM service_request_assignments
        WHERE service_request_id = p_request_id
          AND processor_id = p_processor_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'You are not assigned to this service request' USING ERRCODE = '42501';
    END IF;

    -- If already claimed by someone else → block every action
    IF v_request.claimed_by_processor_id IS NOT NULL
       AND v_request.claimed_by_processor_id <> p_processor_id THEN
        RAISE EXCEPTION 'This request has already been claimed by another processor'
            USING ERRCODE = '55000';
    END IF;

    -- ---- action: schedule ---------------------------------------------
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

    -- ---- action: complete ---------------------------------------------
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

    -- ---- action: cancel -----------------------------------------------
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

    -- ---- action: release ----------------------------------------------
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
-- 7. RPC: list_admin_service_requests
-- Admin oversight view. Scopes by buying_group_id when provided.
-- ============================================================================

CREATE OR REPLACE FUNCTION list_admin_service_requests(
    p_buying_group_id UUID,
    p_status_filter   TEXT,
    p_search          TEXT,
    p_page            INTEGER,
    p_limit           INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total  INTEGER;
    v_items  JSONB;
    v_limit  INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
    v_page   INTEGER := GREATEST(1, COALESCE(p_page, 1));
    v_search TEXT    := NULLIF(TRIM(COALESCE(p_search, '')), '');
BEGIN
    v_offset := (v_page - 1) * v_limit;

    SELECT COUNT(*) INTO v_total
    FROM service_requests sr
    LEFT JOIN pharmacy p ON p.id = sr.pharmacy_id
    WHERE (p_buying_group_id IS NULL OR sr.buying_group_id = p_buying_group_id)
      AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
      AND (
          v_search IS NULL
          OR p.name ILIKE '%' || v_search || '%'
          OR p.pharmacy_name ILIKE '%' || v_search || '%'
          OR p.email         ILIKE '%' || v_search || '%'
      );

    SELECT COALESCE(jsonb_agg(item_row ORDER BY (item_row->>'created_at') DESC), '[]'::jsonb)
    INTO v_items
    FROM (
        SELECT to_jsonb(sr.*) || jsonb_build_object(
            'pharmacy_business_name', p.name,
            'pharmacy_name',          p.pharmacy_name,
            'pharmacy_phone',         p.phone,
            'pharmacy_email',         p.email,
            'branch_business_name',   b.name,
            'branch_name',            b.pharmacy_name,
            'claimed_processor_name',  proc.name,
            'claimed_processor_email', proc.email,
            'assigned_processors', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'processor_id', pr.id,
                    'name',         pr.name,
                    'email',        pr.email,
                    'phone',        pr.phone
                )), '[]'::jsonb)
                FROM service_request_assignments sra
                JOIN processors pr ON pr.id = sra.processor_id
                WHERE sra.service_request_id = sr.id
            )
        ) AS item_row
        FROM service_requests sr
        LEFT JOIN pharmacy   p    ON p.id   = sr.pharmacy_id
        LEFT JOIN pharmacy   b    ON b.id   = sr.branch_id
        LEFT JOIN processors proc ON proc.id = sr.claimed_by_processor_id
        WHERE (p_buying_group_id IS NULL OR sr.buying_group_id = p_buying_group_id)
          AND (p_status_filter IS NULL OR p_status_filter = 'all' OR sr.status = p_status_filter)
          AND (
              v_search IS NULL
              OR p.name ILIKE '%' || v_search || '%'
              OR p.pharmacy_name ILIKE '%' || v_search || '%'
              OR p.email         ILIKE '%' || v_search || '%'
          )
        ORDER BY sr.created_at DESC
        OFFSET v_offset
        LIMIT v_limit
    ) q;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'page',  v_page,
        'limit', v_limit
    );
END;
$$;


-- ============================================================================
-- 8. RPC: admin_reassign_service_request
-- Admin forcibly clears the claim and re-seeds assignments with a new list
-- of processors. Useful when auto-assignment missed a rep or the claiming
-- rep is unavailable. Can only reassign non-terminal requests.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_reassign_service_request(
    p_request_id   UUID,
    p_processor_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_request service_requests%ROWTYPE;
    v_added_processors JSONB;
BEGIN
    SELECT * INTO v_request FROM service_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found' USING ERRCODE = '02000';
    END IF;

    IF v_request.status IN ('completed','cancelled') THEN
        RAISE EXCEPTION 'Cannot reassign a % request', v_request.status USING ERRCODE = '55000';
    END IF;

    -- Clear any existing claim and reset to pending if it was scheduled by a now-unassigned processor
    UPDATE service_requests SET
        claimed_by_processor_id = NULL,
        claimed_at              = NULL,
        status                  = 'pending',
        scheduled_date          = NULL,
        scheduler_notes         = NULL
    WHERE id = p_request_id;

    -- Replace assignments with the admin-provided set
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

    -- Notify the (new) assigned processors that admin handed this to them.
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
-- 9. RPC: get_service_request_detail
-- Full detail + pharmacy + branch + assigned processors + claimed processor.
-- Authorization is enforced in the application layer (pharmacy / processor /
-- admin controller calls this only after verifying the caller can access it).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_service_request_detail(
    p_request_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT
        to_jsonb(sr.*)
        || jsonb_build_object(
            'pharmacy', (
                SELECT jsonb_build_object(
                    'id',            p.id,
                    'business_name', p.name,
                    'pharmacy_name', p.pharmacy_name,
                    'email',         p.email,
                    'phone',         p.phone
                ) FROM pharmacy p WHERE p.id = sr.pharmacy_id
            ),
            'branch', (
                SELECT CASE WHEN sr.branch_id IS NULL THEN NULL ELSE
                    jsonb_build_object(
                        'id',            b.id,
                        'business_name', b.name,
                        'pharmacy_name', b.pharmacy_name
                    ) END
                FROM pharmacy b WHERE b.id = sr.branch_id
            ),
            'claimed_processor', (
                SELECT CASE WHEN sr.claimed_by_processor_id IS NULL THEN NULL ELSE
                    jsonb_build_object(
                        'processor_id', pr.id,
                        'name',         pr.name,
                        'email',        pr.email,
                        'phone',        pr.phone
                    ) END
                FROM processors pr WHERE pr.id = sr.claimed_by_processor_id
            ),
            'assigned_processors', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'processor_id', pr.id,
                    'name',         pr.name,
                    'email',        pr.email,
                    'phone',        pr.phone,
                    'status',       pr.status
                )), '[]'::jsonb)
                FROM service_request_assignments sra
                JOIN processors pr ON pr.id = sra.processor_id
                WHERE sra.service_request_id = sr.id
            )
        )
    INTO v_result
    FROM service_requests sr
    WHERE sr.id = p_request_id;

    RETURN v_result;
END;
$$;


-- ============================================================================
-- 10. PHARMACY PERMISSIONS (branch-user RBAC)
-- ----------------------------------------------------------------------------
-- Parent pharmacies automatically get all permissions; these rows let branch
-- users be granted view/create access by their parent through the roles UI.
-- ============================================================================

INSERT INTO pharmacy_permissions (permission_key, module, action, display_name, description, sort_order) VALUES
  ('on_site_service:view',   'on_site_service', 'view',   'View On-Site Service',   'View on-site service / field rep visit requests', 280),
  ('on_site_service:create', 'on_site_service', 'create', 'Create On-Site Service', 'Create on-site service / field rep visit requests', 290),
  ('on_site_service:cancel', 'on_site_service', 'cancel', 'Cancel On-Site Service', 'Cancel pending on-site service requests',         300)
ON CONFLICT (permission_key) DO NOTHING;


-- ============================================================================
-- GRANTS (RPCs are invoked via supabaseAdmin which bypasses RLS; grants are
-- mostly ceremonial but included for completeness).
-- ============================================================================
GRANT EXECUTE ON FUNCTION create_service_request          (UUID, DATE, UUID, TEXT, TEXT, UUID)    TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION list_pharmacy_service_requests  (UUID, TEXT, INTEGER, INTEGER)          TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION cancel_pharmacy_service_request (UUID, UUID, TEXT)                      TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION list_processor_service_requests (UUID, TEXT, INTEGER, INTEGER)          TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION claim_service_request           (UUID, UUID, TEXT, DATE, TEXT)          TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION list_admin_service_requests     (UUID, TEXT, TEXT, INTEGER, INTEGER)    TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION admin_reassign_service_request  (UUID, UUID[])                          TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_service_request_detail      (UUID)                                  TO service_role, authenticated;
