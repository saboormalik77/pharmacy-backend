-- ============================================================
-- PHARMACY MULTI-BRANCH SYSTEM
-- ============================================================
-- This script creates the complete infrastructure for:
--   1. Branch pharmacy management (parent → branch hierarchy)
--   2. Granular permission system for pharmacy features
--   3. Custom roles that pharmacy admins can assign to branches
--   4. Branch invite flow (similar to admin invite flow)
--   5. Portal switching (parent can operate as branch)
--
-- Prerequisites: pharmacy table, pharmacy_invites table must exist.
-- Run this entire script in the Supabase SQL Editor.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- SECTION 1: ALTER PHARMACY TABLE
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pharmacy' AND column_name = 'parent_pharmacy_id') THEN
    ALTER TABLE pharmacy ADD COLUMN parent_pharmacy_id UUID REFERENCES pharmacy(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pharmacy' AND column_name = 'can_manage_branches') THEN
    ALTER TABLE pharmacy ADD COLUMN can_manage_branches BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pharmacy_parent_id ON pharmacy(parent_pharmacy_id);

-- Mark existing admin-created pharmacies as branch managers
UPDATE pharmacy
SET can_manage_branches = TRUE
WHERE parent_pharmacy_id IS NULL
  AND email IN (SELECT email FROM pharmacy_invites WHERE status = 'completed');

-- Fallback: any root pharmacy (no parent). Branch rows always have parent_pharmacy_id set.
-- Use this if your pharmacy completed setup but email no longer matches pharmacy_invites.
UPDATE pharmacy
SET can_manage_branches = TRUE
WHERE parent_pharmacy_id IS NULL
  AND COALESCE(can_manage_branches, FALSE) IS NOT TRUE;


-- ════════════════════════════════════════════════════════════
-- SECTION 2: PHARMACY PERMISSIONS (MASTER LIST)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pharmacy_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pharmacy_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on pharmacy_permissions" ON pharmacy_permissions;
CREATE POLICY "Service role full access on pharmacy_permissions"
  ON pharmacy_permissions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

INSERT INTO pharmacy_permissions (permission_key, module, action, display_name, description, sort_order) VALUES
  ('returns:view',           'returns',            'view',     'View Returns',             'View returns list and return details',                   10),
  ('returns:create',         'returns',            'create',   'Create Returns',           'Create new return transactions',                         20),
  ('returns:edit',           'returns',            'edit',     'Edit Returns',             'Edit and update return transactions',                    30),
  ('returns:delete',         'returns',            'delete',   'Delete Returns',           'Delete return transactions',                             40),
  ('tbd_items:view',         'tbd_items',          'view',     'View TBD Items',           'View items pending determination',                       50),
  ('tbd_items:manage',       'tbd_items',          'manage',   'Manage TBD Items',         'Resolve and manage TBD items',                           60),
  ('destruction:view',       'destruction',        'view',     'View Destruction',         'View destruction records',                               70),
  ('destruction:manage',     'destruction',        'manage',   'Manage Destruction',       'Create and manage destruction records',                   80),
  ('wine_cellar:view',       'wine_cellar',        'view',     'View Wine Cellar',         'View wine cellar items and stats',                       90),
  ('wine_cellar:manage',     'wine_cellar',        'manage',   'Manage Wine Cellar',       'Add, update, and manage wine cellar items',             100),
  ('products:view',          'products',           'view',     'View Products',            'View product list and details',                         110),
  ('products:manage',        'products',           'manage',   'Manage Products',          'Add, edit, and delete products',                        120),
  ('optimization:view',      'optimization',       'view',     'View Optimization',        'Access search and optimization tools',                  130),
  ('marketplace:view',       'marketplace',        'view',     'View Marketplace',         'Browse marketplace deals and listings',                 140),
  ('marketplace:purchase',   'marketplace',        'purchase', 'Purchase from Marketplace', 'Add to cart and complete purchases',                   150),
  ('orders:view',            'orders',             'view',     'View Orders',              'View order list and order details',                     160),
  ('inventory_analysis:view','inventory_analysis', 'view',     'View Inventory Analysis',  'Access inventory analysis tools',                       170),
  ('credits:view',           'credits',            'view',     'View Credits',             'View credit estimates and statements',                  180),
  ('analytics:view',         'analytics',          'view',     'View Analytics',           'Access analytics dashboards and reports',               190),
  ('documents:view',         'documents',          'view',     'View Documents',           'View uploaded documents and reports',                   200),
  ('documents:upload',       'documents',          'upload',   'Upload Documents',         'Upload new documents and return reports',               210),
  ('settings:view',          'settings',           'view',     'View Settings',            'View pharmacy settings',                                220),
  ('settings:manage',        'settings',           'manage',   'Manage Settings',          'Update pharmacy settings and preferences',              230),
  ('subscription:view',      'subscription',       'view',     'View Subscription',        'View subscription plan details',                        240),
  ('subscription:manage',    'subscription',       'manage',   'Manage Subscription',      'Change, cancel, or reactivate subscription',           250),
  ('payments:view',          'payments',           'view',     'View Payments',            'View pharmacy payment records',                         260),
  ('notifications:view',     'notifications',      'view',     'View Notifications',       'View and manage notifications',                         270)
ON CONFLICT (permission_key) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- SECTION 3: PHARMACY ROLES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pharmacy_roles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_pharmacy_id  UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  role_name           TEXT NOT NULL,
  description         TEXT,
  is_default          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_pharmacy_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_roles_parent ON pharmacy_roles(parent_pharmacy_id);

ALTER TABLE pharmacy_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on pharmacy_roles" ON pharmacy_roles;
CREATE POLICY "Service role full access on pharmacy_roles"
  ON pharmacy_roles FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- SECTION 4: PHARMACY ROLE ↔ PERMISSION MAPPING
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pharmacy_role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES pharmacy_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES pharmacy_permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_role_perms_role ON pharmacy_role_permissions(role_id);

ALTER TABLE pharmacy_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on pharmacy_role_permissions" ON pharmacy_role_permissions;
CREATE POLICY "Service role full access on pharmacy_role_permissions"
  ON pharmacy_role_permissions FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- SECTION 5: BRANCH → ROLE ASSIGNMENTS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pharmacy_branch_role_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_pharmacy_id  UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  role_id             UUID NOT NULL REFERENCES pharmacy_roles(id) ON DELETE CASCADE,
  assigned_by         UUID NOT NULL REFERENCES pharmacy(id),
  assigned_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_pharmacy_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_role_assign_branch ON pharmacy_branch_role_assignments(branch_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_branch_role_assign_role   ON pharmacy_branch_role_assignments(role_id);

ALTER TABLE pharmacy_branch_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on pharmacy_branch_role_assignments" ON pharmacy_branch_role_assignments;
CREATE POLICY "Service role full access on pharmacy_branch_role_assignments"
  ON pharmacy_branch_role_assignments FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- SECTION 6: BRANCH INVITES TABLE
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pharmacy_branch_invites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_pharmacy_id  UUID NOT NULL REFERENCES pharmacy(id),
  invite_token        TEXT NOT NULL UNIQUE,
  email               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired')),
  expires_at          TIMESTAMPTZ NOT NULL,
  completed_at        TIMESTAMPTZ,
  pharmacy_name       TEXT NOT NULL,
  contact_name        TEXT,
  phone               TEXT,
  fax                 TEXT,
  street              TEXT,
  city                TEXT,
  state               TEXT,
  zip                 TEXT,
  wholesaler          TEXT,
  wholesaler_account  TEXT,
  secondary_wholesaler TEXT,
  dea_number          TEXT,
  dea_expiration      DATE,
  service_type        TEXT DEFAULT 'full_service',
  days_between_visits INTEGER DEFAULT 120,
  last_visit_date     DATE,
  next_visit_date     DATE,
  processor_id        UUID,
  sales_person_id     UUID,
  pending_role_ids    UUID[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pharmacy_branch_invites
  ADD COLUMN IF NOT EXISTS pending_role_ids UUID[];

CREATE INDEX IF NOT EXISTS idx_branch_invites_token  ON pharmacy_branch_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_branch_invites_email  ON pharmacy_branch_invites(email);
CREATE INDEX IF NOT EXISTS idx_branch_invites_parent ON pharmacy_branch_invites(parent_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_branch_invites_status ON pharmacy_branch_invites(status);

ALTER TABLE pharmacy_branch_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on pharmacy_branch_invites" ON pharmacy_branch_invites;
CREATE POLICY "Service role full access on pharmacy_branch_invites"
  ON pharmacy_branch_invites FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- SECTION 7: RPC — BRANCH CREATION
-- ════════════════════════════════════════════════════════════

-- Drop stale overloads (e.g. 20-arg without p_pending_role_ids) so only this signature exists.
DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'pharmacy_admin_create_branch'
      AND n.nspname = 'public'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', fn);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.pharmacy_admin_create_branch(
  p_parent_pharmacy_id  UUID,
  p_pharmacy_name       TEXT,
  p_email               TEXT,
  p_contact_name        TEXT DEFAULT NULL,
  p_phone               TEXT DEFAULT NULL,
  p_fax                 TEXT DEFAULT NULL,
  p_street              TEXT DEFAULT NULL,
  p_city                TEXT DEFAULT NULL,
  p_state               TEXT DEFAULT NULL,
  p_zip                 TEXT DEFAULT NULL,
  p_wholesaler          TEXT DEFAULT NULL,
  p_wholesaler_account  TEXT DEFAULT NULL,
  p_secondary_wholesaler TEXT DEFAULT NULL,
  p_dea_number          TEXT DEFAULT NULL,
  p_dea_expiration      DATE DEFAULT NULL,
  p_service_type        TEXT DEFAULT 'full_service',
  p_days_between_visits INTEGER DEFAULT 120,
  p_last_visit_date     DATE DEFAULT NULL,
  p_next_visit_date     DATE DEFAULT NULL,
  p_processor_id        UUID DEFAULT NULL,
  p_sales_person_id     UUID DEFAULT NULL,
  p_pending_role_ids    UUID[] DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_parent RECORD;
  v_invite_id UUID;
  v_invite_token TEXT;
  v_rid UUID;
BEGIN
  SELECT id, pharmacy_name, parent_pharmacy_id, status, can_manage_branches
  INTO v_parent FROM pharmacy WHERE id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Parent pharmacy not found');
  END IF;
  IF v_parent.parent_pharmacy_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Branch pharmacies cannot create sub-branches');
  END IF;
  IF v_parent.can_manage_branches IS NOT TRUE THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'This pharmacy does not have branch management capability');
  END IF;
  IF v_parent.status != 'active' THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Parent pharmacy account is not active');
  END IF;

  IF p_pharmacy_name IS NULL OR TRIM(p_pharmacy_name) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Branch pharmacy name is required');
  END IF;
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Email is required');
  END IF;

  IF EXISTS (SELECT 1 FROM pharmacy WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pharmacy with this email already exists');
  END IF;
  IF EXISTS (SELECT 1 FROM pharmacy_branch_invites
             WHERE email = LOWER(TRIM(p_email)) AND status = 'pending' AND expires_at > NOW()) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pending branch invitation already exists for this email');
  END IF;
  IF EXISTS (SELECT 1 FROM pharmacy_invites
             WHERE email = LOWER(TRIM(p_email)) AND status = 'pending' AND expires_at > NOW()) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A pending pharmacy invitation already exists for this email');
  END IF;

  IF p_service_type NOT IN ('full_service', 'self_service') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Service type must be full_service or self_service');
  END IF;

  IF p_pending_role_ids IS NOT NULL AND cardinality(p_pending_role_ids) > 0 THEN
    FOREACH v_rid IN ARRAY p_pending_role_ids
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pharmacy_roles
        WHERE id = v_rid AND parent_pharmacy_id = p_parent_pharmacy_id
      ) THEN
        RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'One or more role IDs are invalid or do not belong to your pharmacy');
      END IF;
    END LOOP;
  END IF;

  v_invite_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO pharmacy_branch_invites (
    parent_pharmacy_id, invite_token, email, status, expires_at,
    pharmacy_name, contact_name, phone, fax,
    street, city, state, zip,
    wholesaler, wholesaler_account, secondary_wholesaler,
    dea_number, dea_expiration,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    processor_id, sales_person_id,
    pending_role_ids
  ) VALUES (
    p_parent_pharmacy_id, v_invite_token, LOWER(TRIM(p_email)), 'pending',
    NOW() + INTERVAL '7 days',
    TRIM(p_pharmacy_name), p_contact_name, p_phone, p_fax,
    p_street, p_city, p_state, p_zip,
    p_wholesaler, p_wholesaler_account, p_secondary_wholesaler,
    p_dea_number, p_dea_expiration,
    p_service_type, COALESCE(p_days_between_visits, 120),
    p_last_visit_date, p_next_visit_date,
    p_processor_id, p_sales_person_id,
    CASE
      WHEN p_pending_role_ids IS NOT NULL AND cardinality(p_pending_role_ids) > 0 THEN p_pending_role_ids
      ELSE NULL
    END
  ) RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId', v_invite_id,
      'inviteToken', v_invite_token,
      'email', LOWER(TRIM(p_email)),
      'pharmacyName', TRIM(p_pharmacy_name),
      'parentPharmacyName', v_parent.pharmacy_name
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 8: RPC — VERIFY BRANCH INVITE
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_branch_invite(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
  v_parent_name TEXT;
  v_address JSONB;
BEGIN
  IF p_token IS NULL OR TRIM(p_token) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invite token is required');
  END IF;

  SELECT * INTO v_invite FROM pharmacy_branch_invites WHERE invite_token = TRIM(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Invalid invite link');
  END IF;
  IF v_invite.status = 'completed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'This invite has already been used. Please log in instead.');
  END IF;
  IF v_invite.expires_at < NOW() THEN
    UPDATE pharmacy_branch_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('error', true, 'code', 410, 'message', 'This invite link has expired. Please contact your pharmacy administrator.');
  END IF;

  SELECT pharmacy_name INTO v_parent_name FROM pharmacy WHERE id = v_invite.parent_pharmacy_id;

  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city',   COALESCE(v_invite.city, ''),
    'state',  COALESCE(v_invite.state, ''),
    'zip',    COALESCE(v_invite.zip, '')
  );

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId',          v_invite.id,
      'email',             v_invite.email,
      'pharmacyName',      v_invite.pharmacy_name,
      'parentPharmacyName',v_parent_name,
      'contactName',       v_invite.contact_name,
      'phone',             v_invite.phone,
      'fax',               v_invite.fax,
      'deaNumber',         v_invite.dea_number,
      'physicalAddress',   v_address,
      'serviceType',       v_invite.service_type,
      'wholesaler',        v_invite.wholesaler,
      'wholesalerAccount', v_invite.wholesaler_account,
      'isBranch',          true
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 9: RPC — COMPLETE BRANCH SETUP
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION complete_branch_setup(
  p_token        TEXT,
  p_auth_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
  v_pharmacy_id UUID;
  v_address JSONB;
  v_role_id UUID;
BEGIN
  SELECT * INTO v_invite
  FROM pharmacy_branch_invites
  WHERE invite_token = TRIM(p_token) AND status = 'pending' AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid or expired invite');
  END IF;

  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city',   COALESCE(v_invite.city, ''),
    'state',  COALESCE(v_invite.state, ''),
    'zip',    COALESCE(v_invite.zip, '')
  );

  INSERT INTO pharmacy (
    id, email, name, pharmacy_name, phone,
    physical_address, status, parent_pharmacy_id, can_manage_branches,
    dea_number, dea_expiration_date, fax_number,
    primary_wholesaler, wholesaler_account_number, secondary_wholesaler,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    assigned_processor_id, assigned_sales_person_id,
    created_at, updated_at
  ) VALUES (
    p_auth_user_id, v_invite.email,
    COALESCE(v_invite.contact_name, v_invite.pharmacy_name),
    v_invite.pharmacy_name, v_invite.phone,
    v_address, 'active', v_invite.parent_pharmacy_id, FALSE,
    v_invite.dea_number, v_invite.dea_expiration, v_invite.fax,
    v_invite.wholesaler, v_invite.wholesaler_account, v_invite.secondary_wholesaler,
    v_invite.service_type, v_invite.days_between_visits,
    v_invite.last_visit_date, v_invite.next_visit_date,
    v_invite.processor_id, v_invite.sales_person_id,
    NOW(), NOW()
  ) RETURNING id INTO v_pharmacy_id;

  IF v_invite.pending_role_ids IS NOT NULL AND cardinality(v_invite.pending_role_ids) > 0 THEN
    FOREACH v_role_id IN ARRAY v_invite.pending_role_ids
    LOOP
      IF EXISTS (
        SELECT 1 FROM pharmacy_roles
        WHERE id = v_role_id AND parent_pharmacy_id = v_invite.parent_pharmacy_id
      ) THEN
        INSERT INTO pharmacy_branch_role_assignments (branch_pharmacy_id, role_id, assigned_by)
        VALUES (v_pharmacy_id, v_role_id, v_invite.parent_pharmacy_id)
        ON CONFLICT (branch_pharmacy_id, role_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  UPDATE pharmacy_branch_invites
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId',       v_pharmacy_id,
      'parentPharmacyId', v_invite.parent_pharmacy_id,
      'status',           'active'
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 10: RPC — LIST BRANCHES
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pharmacy_branches(
  p_parent_pharmacy_id UUID,
  p_search  TEXT    DEFAULT NULL,
  p_status  TEXT    DEFAULT 'all',
  p_page    INTEGER DEFAULT 1,
  p_limit   INTEGER DEFAULT 20
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_offset  INTEGER;
  v_total   BIGINT;
  v_result  JSONB := '[]'::jsonb;
  v_branch  RECORD;
  v_roles   JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_parent_pharmacy_id AND parent_pharmacy_id IS NULL AND can_manage_branches = TRUE) THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Access denied: not a pharmacy admin');
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM pharmacy
  WHERE parent_pharmacy_id = p_parent_pharmacy_id
    AND (p_status = 'all' OR status = p_status)
    AND (p_search IS NULL OR p_search = ''
         OR pharmacy_name ILIKE '%' || p_search || '%'
         OR email ILIKE '%' || p_search || '%'
         OR name ILIKE '%' || p_search || '%');

  FOR v_branch IN
    SELECT id, email, name, pharmacy_name, phone, physical_address,
           status, dea_number, created_at, updated_at
    FROM pharmacy
    WHERE parent_pharmacy_id = p_parent_pharmacy_id
      AND (p_status = 'all' OR status = p_status)
      AND (p_search IS NULL OR p_search = ''
           OR pharmacy_name ILIKE '%' || p_search || '%'
           OR email ILIKE '%' || p_search || '%'
           OR name ILIKE '%' || p_search || '%')
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset
  LOOP
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'roleId',   r.id,
      'roleName', r.role_name
    )), '[]'::jsonb)
    INTO v_roles
    FROM pharmacy_branch_role_assignments bra
    JOIN pharmacy_roles r ON r.id = bra.role_id
    WHERE bra.branch_pharmacy_id = v_branch.id;

    v_result := v_result || jsonb_build_object(
      'id',              v_branch.id,
      'email',           v_branch.email,
      'name',            v_branch.name,
      'pharmacyName',    v_branch.pharmacy_name,
      'phone',           v_branch.phone,
      'physicalAddress',  v_branch.physical_address,
      'status',          v_branch.status,
      'deaNumber',       v_branch.dea_number,
      'createdAt',       v_branch.created_at,
      'updatedAt',       v_branch.updated_at,
      'assignedRoles',   v_roles
    );
  END LOOP;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'branches',   v_result,
      'total',      v_total,
      'page',       p_page,
      'limit',      p_limit,
      'totalPages', CEIL(v_total::float / GREATEST(p_limit, 1))
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 11: RPC — BRANCH DETAIL
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_branch_pharmacy_detail(
  p_parent_pharmacy_id UUID,
  p_branch_pharmacy_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_branch RECORD;
  v_roles  JSONB;
  v_perms  JSONB;
BEGIN
  SELECT * INTO v_branch FROM pharmacy
  WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch pharmacy not found or does not belong to this parent');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'roleId',      r.id,
    'roleName',    r.role_name,
    'description', r.description
  )), '[]'::jsonb)
  INTO v_roles
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy_roles r ON r.id = bra.role_id
  WHERE bra.branch_pharmacy_id = p_branch_pharmacy_id;

  SELECT COALESCE(jsonb_agg(DISTINCT pp.permission_key ORDER BY pp.permission_key), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy_role_permissions rp ON rp.role_id = bra.role_id
  JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
  WHERE bra.branch_pharmacy_id = p_branch_pharmacy_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',             v_branch.id,
      'email',          v_branch.email,
      'name',           v_branch.name,
      'pharmacyName',   v_branch.pharmacy_name,
      'phone',          v_branch.phone,
      'physicalAddress', v_branch.physical_address,
      'status',         v_branch.status,
      'deaNumber',      v_branch.dea_number,
      'createdAt',      v_branch.created_at,
      'updatedAt',      v_branch.updated_at,
      'assignedRoles',  v_roles,
      'permissions',    v_perms
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 12: RPC — UPDATE BRANCH STATUS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_branch_pharmacy_status(
  p_parent_pharmacy_id UUID,
  p_branch_pharmacy_id UUID,
  p_status             TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_status NOT IN ('active', 'suspended') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Status must be active or suspended');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pharmacy
    WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id
  ) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch not found or does not belong to this parent');
  END IF;

  UPDATE pharmacy SET status = p_status, updated_at = NOW()
  WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object('branchId', p_branch_pharmacy_id, 'status', p_status)
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 13: RPC — RESEND BRANCH INVITE
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION resend_branch_invite(
  p_parent_pharmacy_id UUID,
  p_invite_id          UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
  v_new_token TEXT;
BEGIN
  SELECT * INTO v_invite
  FROM pharmacy_branch_invites
  WHERE id = p_invite_id AND parent_pharmacy_id = p_parent_pharmacy_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pending invite not found');
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');

  UPDATE pharmacy_branch_invites
  SET invite_token = v_new_token, expires_at = NOW() + INTERVAL '7 days'
  WHERE id = p_invite_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inviteId',    v_invite.id,
      'inviteToken', v_new_token,
      'email',       v_invite.email,
      'pharmacyName', v_invite.pharmacy_name
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 14: RPC — PENDING BRANCH INVITES
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pending_branch_invites(p_parent_pharmacy_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invites JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',           bi.id,
    'email',        bi.email,
    'pharmacyName', bi.pharmacy_name,
    'contactName',  bi.contact_name,
    'createdAt',    bi.created_at,
    'expiresAt',    bi.expires_at
  ) ORDER BY bi.created_at DESC), '[]'::jsonb)
  INTO v_invites
  FROM pharmacy_branch_invites bi
  WHERE bi.parent_pharmacy_id = p_parent_pharmacy_id
    AND bi.status = 'pending'
    AND bi.expires_at > NOW();

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('invites', v_invites));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 15: RPC — CREATE PHARMACY ROLE
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_pharmacy_role(
  p_parent_pharmacy_id UUID,
  p_role_name          TEXT,
  p_description        TEXT DEFAULT NULL,
  p_permission_keys    TEXT[] DEFAULT '{}'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
  v_key     TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_parent_pharmacy_id AND parent_pharmacy_id IS NULL AND can_manage_branches = TRUE) THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Access denied');
  END IF;

  IF p_role_name IS NULL OR TRIM(p_role_name) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Role name is required');
  END IF;

  IF EXISTS (SELECT 1 FROM pharmacy_roles WHERE parent_pharmacy_id = p_parent_pharmacy_id AND role_name = TRIM(p_role_name)) THEN
    RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A role with this name already exists');
  END IF;

  INSERT INTO pharmacy_roles (parent_pharmacy_id, role_name, description)
  VALUES (p_parent_pharmacy_id, TRIM(p_role_name), p_description)
  RETURNING id INTO v_role_id;

  IF array_length(p_permission_keys, 1) > 0 THEN
    FOREACH v_key IN ARRAY p_permission_keys LOOP
      SELECT id INTO v_perm_id FROM pharmacy_permissions WHERE permission_key = v_key;
      IF v_perm_id IS NOT NULL THEN
        INSERT INTO pharmacy_role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
      END IF;
      v_perm_id := NULL;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('roleId', v_role_id, 'roleName', TRIM(p_role_name)));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 16: RPC — UPDATE PHARMACY ROLE
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_pharmacy_role(
  p_parent_pharmacy_id UUID,
  p_role_id            UUID,
  p_role_name          TEXT DEFAULT NULL,
  p_description        TEXT DEFAULT NULL,
  p_permission_keys    TEXT[] DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing RECORD;
  v_perm_id  UUID;
  v_key      TEXT;
BEGIN
  SELECT * INTO v_existing FROM pharmacy_roles
  WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  IF p_role_name IS NOT NULL AND TRIM(p_role_name) != '' THEN
    IF EXISTS (SELECT 1 FROM pharmacy_roles
               WHERE parent_pharmacy_id = p_parent_pharmacy_id
                 AND role_name = TRIM(p_role_name) AND id != p_role_id) THEN
      RETURN jsonb_build_object('error', true, 'code', 409, 'message', 'A role with this name already exists');
    END IF;
    UPDATE pharmacy_roles SET role_name = TRIM(p_role_name), updated_at = NOW() WHERE id = p_role_id;
  END IF;

  IF p_description IS NOT NULL THEN
    UPDATE pharmacy_roles SET description = p_description, updated_at = NOW() WHERE id = p_role_id;
  END IF;

  IF p_permission_keys IS NOT NULL THEN
    DELETE FROM pharmacy_role_permissions WHERE role_id = p_role_id;

    IF array_length(p_permission_keys, 1) > 0 THEN
      FOREACH v_key IN ARRAY p_permission_keys LOOP
        SELECT id INTO v_perm_id FROM pharmacy_permissions WHERE permission_key = v_key;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO pharmacy_role_permissions (role_id, permission_id) VALUES (p_role_id, v_perm_id)
          ON CONFLICT DO NOTHING;
        END IF;
        v_perm_id := NULL;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('roleId', p_role_id));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 17: RPC — DELETE PHARMACY ROLE
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION delete_pharmacy_role(
  p_parent_pharmacy_id UUID,
  p_role_id            UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy_roles WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  DELETE FROM pharmacy_branch_role_assignments WHERE role_id = p_role_id;
  DELETE FROM pharmacy_role_permissions WHERE role_id = p_role_id;
  DELETE FROM pharmacy_roles WHERE id = p_role_id;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('deleted', true));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 18: RPC — LIST PHARMACY ROLES
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION list_pharmacy_roles(p_parent_pharmacy_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_roles  JSONB;
  v_role   RECORD;
  v_result JSONB := '[]'::jsonb;
  v_perms  JSONB;
  v_count  BIGINT;
BEGIN
  FOR v_role IN
    SELECT id, role_name, description, is_default, created_at, updated_at
    FROM pharmacy_roles
    WHERE parent_pharmacy_id = p_parent_pharmacy_id
    ORDER BY created_at ASC
  LOOP
    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_perms
    FROM pharmacy_role_permissions rp
    JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
    WHERE rp.role_id = v_role.id;

    SELECT COUNT(*) INTO v_count
    FROM pharmacy_branch_role_assignments WHERE role_id = v_role.id;

    v_result := v_result || jsonb_build_object(
      'id',              v_role.id,
      'roleName',        v_role.role_name,
      'description',     v_role.description,
      'isDefault',       v_role.is_default,
      'permissions',     v_perms,
      'assignedCount',   v_count,
      'createdAt',       v_role.created_at,
      'updatedAt',       v_role.updated_at
    );
  END LOOP;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('roles', v_result));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 19: RPC — GET SINGLE ROLE DETAIL
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pharmacy_role_detail(
  p_parent_pharmacy_id UUID,
  p_role_id            UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role  RECORD;
  v_perms JSONB;
  v_branches JSONB;
BEGIN
  SELECT * INTO v_role FROM pharmacy_roles
  WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_role_permissions rp
  JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
  WHERE rp.role_id = p_role_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'branchId',     p.id,
    'pharmacyName', p.pharmacy_name,
    'email',        p.email,
    'status',       p.status
  )), '[]'::jsonb)
  INTO v_branches
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy p ON p.id = bra.branch_pharmacy_id
  WHERE bra.role_id = p_role_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',           v_role.id,
      'roleName',     v_role.role_name,
      'description',  v_role.description,
      'isDefault',    v_role.is_default,
      'permissions',  v_perms,
      'assignedBranches', v_branches,
      'createdAt',    v_role.created_at,
      'updatedAt',    v_role.updated_at
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 20: RPC — ASSIGN / REMOVE ROLE TO BRANCH
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION assign_role_to_branch(
  p_parent_pharmacy_id UUID,
  p_branch_pharmacy_id UUID,
  p_role_id            UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy_roles WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_branch_pharmacy_id AND parent_pharmacy_id = p_parent_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch pharmacy not found or does not belong to this parent');
  END IF;

  INSERT INTO pharmacy_branch_role_assignments (branch_pharmacy_id, role_id, assigned_by)
  VALUES (p_branch_pharmacy_id, p_role_id, p_parent_pharmacy_id)
  ON CONFLICT (branch_pharmacy_id, role_id) DO NOTHING;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('assigned', true));
END;
$$;

CREATE OR REPLACE FUNCTION remove_role_from_branch(
  p_parent_pharmacy_id UUID,
  p_branch_pharmacy_id UUID,
  p_role_id            UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy_roles WHERE id = p_role_id AND parent_pharmacy_id = p_parent_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Role not found');
  END IF;

  DELETE FROM pharmacy_branch_role_assignments
  WHERE branch_pharmacy_id = p_branch_pharmacy_id AND role_id = p_role_id;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('removed', true));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 21: RPC — LIST ALL PHARMACY PERMISSIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION list_all_pharmacy_permissions()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_perms JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',            pp.id,
    'permissionKey', pp.permission_key,
    'module',        pp.module,
    'action',        pp.action,
    'displayName',   pp.display_name,
    'description',   pp.description,
    'sortOrder',     pp.sort_order
  ) ORDER BY pp.sort_order), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_permissions pp;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object('permissions', v_perms));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 22: RPC — GET BRANCH EFFECTIVE PERMISSIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_branch_effective_permissions(p_pharmacy_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pharmacy RECORD;
  v_perms    JSONB;
BEGIN
  SELECT id, parent_pharmacy_id, can_manage_branches, status
  INTO v_pharmacy FROM pharmacy WHERE id = p_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  IF v_pharmacy.parent_pharmacy_id IS NULL THEN
    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_perms FROM pharmacy_permissions pp;

    RETURN jsonb_build_object('error', false, 'data', jsonb_build_object(
      'permissions', v_perms, 'isFullAccess', true
    ));
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT pp.permission_key), '[]'::jsonb)
  INTO v_perms
  FROM pharmacy_branch_role_assignments bra
  JOIN pharmacy_role_permissions rp ON rp.role_id = bra.role_id
  JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
  WHERE bra.branch_pharmacy_id = p_pharmacy_id;

  RETURN jsonb_build_object('error', false, 'data', jsonb_build_object(
    'permissions', v_perms, 'isFullAccess', false
  ));
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 23: RPC — PHARMACY CONTEXT (called after login)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pharmacy_context(p_pharmacy_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pharmacy    RECORD;
  v_is_parent   BOOLEAN;
  v_is_branch   BOOLEAN;
  v_branches    JSONB := '[]'::jsonb;
  v_parent_info JSONB := 'null'::jsonb;
  v_permissions JSONB;
  v_roles       JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_pharmacy FROM pharmacy WHERE id = p_pharmacy_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_is_branch := v_pharmacy.parent_pharmacy_id IS NOT NULL;
  v_is_parent := NOT v_is_branch AND v_pharmacy.can_manage_branches = TRUE;

  IF v_is_parent THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id',           b.id,
      'pharmacyName', b.pharmacy_name,
      'email',        b.email,
      'status',       b.status
    ) ORDER BY b.pharmacy_name), '[]'::jsonb)
    INTO v_branches
    FROM pharmacy b WHERE b.parent_pharmacy_id = p_pharmacy_id;

    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_permissions FROM pharmacy_permissions pp;
  END IF;

  IF v_is_branch THEN
    SELECT jsonb_build_object('id', p.id, 'pharmacyName', p.pharmacy_name, 'email', p.email)
    INTO v_parent_info FROM pharmacy p WHERE p.id = v_pharmacy.parent_pharmacy_id;

    SELECT COALESCE(jsonb_agg(DISTINCT pp.permission_key), '[]'::jsonb)
    INTO v_permissions
    FROM pharmacy_branch_role_assignments bra
    JOIN pharmacy_role_permissions rp ON rp.role_id = bra.role_id
    JOIN pharmacy_permissions pp ON pp.id = rp.permission_id
    WHERE bra.branch_pharmacy_id = p_pharmacy_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'roleId', r.id, 'roleName', r.role_name
    )), '[]'::jsonb)
    INTO v_roles
    FROM pharmacy_branch_role_assignments bra
    JOIN pharmacy_roles r ON r.id = bra.role_id
    WHERE bra.branch_pharmacy_id = p_pharmacy_id;
  END IF;

  IF NOT v_is_parent AND NOT v_is_branch THEN
    SELECT COALESCE(jsonb_agg(pp.permission_key ORDER BY pp.sort_order), '[]'::jsonb)
    INTO v_permissions FROM pharmacy_permissions pp;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId',       v_pharmacy.id,
      'pharmacyName',     v_pharmacy.pharmacy_name,
      'email',            v_pharmacy.email,
      'isParent',         v_is_parent,
      'isBranch',         v_is_branch,
      'canManageBranches', COALESCE(v_pharmacy.can_manage_branches, false),
      'branches',         v_branches,
      'parentPharmacy',   v_parent_info,
      'permissions',      v_permissions,
      'roles',            v_roles
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 24: RPC — VERIFY SWITCH ACCESS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_pharmacy_switch_access(
  p_parent_pharmacy_id UUID,
  p_branch_pharmacy_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_branch RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_parent_pharmacy_id AND parent_pharmacy_id IS NULL AND can_manage_branches = TRUE) THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Not a pharmacy admin');
  END IF;

  SELECT id, pharmacy_name, email, status, parent_pharmacy_id
  INTO v_branch FROM pharmacy WHERE id = p_branch_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Branch pharmacy not found');
  END IF;

  IF v_branch.parent_pharmacy_id != p_parent_pharmacy_id THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'This branch does not belong to your pharmacy');
  END IF;

  IF v_branch.status != 'active' THEN
    RETURN jsonb_build_object('error', true, 'code', 403, 'message', 'Branch pharmacy is not active');
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'branchId',     v_branch.id,
      'pharmacyName', v_branch.pharmacy_name,
      'email',        v_branch.email,
      'status',       v_branch.status
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 25: UPDATE complete_pharmacy_setup
-- (adds can_manage_branches = TRUE for admin-created pharmacies)
-- ════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS complete_pharmacy_setup(text, uuid);

CREATE OR REPLACE FUNCTION complete_pharmacy_setup(
  p_token         TEXT,
  p_auth_user_id  UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
  v_pharmacy_id UUID;
  v_address JSONB;
BEGIN
  SELECT * INTO v_invite
  FROM pharmacy_invites
  WHERE invite_token = TRIM(p_token)
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid or expired invite');
  END IF;

  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city',   COALESCE(v_invite.city, ''),
    'state',  COALESCE(v_invite.state, ''),
    'zip',    COALESCE(v_invite.zip, '')
  );

  INSERT INTO pharmacy (
    id, email, name, pharmacy_name, phone,
    physical_address, status, can_manage_branches,
    dea_number, dea_expiration_date, fax_number,
    primary_wholesaler, wholesaler_account_number, secondary_wholesaler,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    assigned_processor_id, assigned_sales_person_id,
    created_at, updated_at
  ) VALUES (
    p_auth_user_id,
    v_invite.email,
    COALESCE(v_invite.contact_name, v_invite.pharmacy_name),
    v_invite.pharmacy_name,
    v_invite.phone,
    v_address,
    'active',
    TRUE,
    v_invite.dea_number,
    v_invite.dea_expiration,
    v_invite.fax,
    v_invite.wholesaler,
    v_invite.wholesaler_account,
    v_invite.secondary_wholesaler,
    v_invite.service_type,
    v_invite.days_between_visits,
    v_invite.last_visit_date,
    v_invite.next_visit_date,
    v_invite.processor_id,
    v_invite.sales_person_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_pharmacy_id;

  UPDATE pharmacy_invites
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId', v_pharmacy_id,
      'status', 'active'
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 26: GRANTS
-- ════════════════════════════════════════════════════════════

GRANT ALL ON pharmacy_permissions              TO service_role;
GRANT ALL ON pharmacy_roles                    TO service_role;
GRANT ALL ON pharmacy_role_permissions         TO service_role;
GRANT ALL ON pharmacy_branch_role_assignments  TO service_role;
GRANT ALL ON pharmacy_branch_invites           TO service_role;

-- Grant by catalog identity (avoids 42883 when the static type list does not match pg_proc exactly).
DO $grant_pharmacy_admin_create_branch$
DECLARE
  r regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO r
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'pharmacy_admin_create_branch'
    AND n.nspname = 'public'
    AND p.pronargs = 22;

  IF r IS NULL THEN
    RAISE EXCEPTION 'pharmacy_admin_create_branch (22 args) is missing; run SECTION 7 before SECTION 26';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r);
END $grant_pharmacy_admin_create_branch$;
GRANT EXECUTE ON FUNCTION verify_branch_invite(TEXT)              TO service_role;
GRANT EXECUTE ON FUNCTION complete_branch_setup(TEXT,UUID)        TO service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_branches(UUID,TEXT,TEXT,INTEGER,INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_branch_pharmacy_detail(UUID,UUID)   TO service_role;
GRANT EXECUTE ON FUNCTION update_branch_pharmacy_status(UUID,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION resend_branch_invite(UUID,UUID)         TO service_role;
GRANT EXECUTE ON FUNCTION get_pending_branch_invites(UUID)        TO service_role;
GRANT EXECUTE ON FUNCTION create_pharmacy_role(UUID,TEXT,TEXT,TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION update_pharmacy_role(UUID,UUID,TEXT,TEXT,TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION delete_pharmacy_role(UUID,UUID)         TO service_role;
GRANT EXECUTE ON FUNCTION list_pharmacy_roles(UUID)               TO service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_role_detail(UUID,UUID)     TO service_role;
GRANT EXECUTE ON FUNCTION assign_role_to_branch(UUID,UUID,UUID)   TO service_role;
GRANT EXECUTE ON FUNCTION remove_role_from_branch(UUID,UUID,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION list_all_pharmacy_permissions()         TO service_role;
GRANT EXECUTE ON FUNCTION get_branch_effective_permissions(UUID)  TO service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_context(UUID)              TO service_role;
GRANT EXECUTE ON FUNCTION verify_pharmacy_switch_access(UUID,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION complete_pharmacy_setup(TEXT,UUID)       TO service_role;


-- ════════════════════════════════════════════════════════════
-- SECTION 27: COMMENTS
-- ════════════════════════════════════════════════════════════

COMMENT ON TABLE pharmacy_permissions             IS 'Master list of all pharmacy-portal feature permissions';
COMMENT ON TABLE pharmacy_roles                   IS 'Custom roles created by parent pharmacies for their branches';
COMMENT ON TABLE pharmacy_role_permissions         IS 'Maps roles to individual permissions';
COMMENT ON TABLE pharmacy_branch_role_assignments  IS 'Assigns roles to branch pharmacies';
COMMENT ON TABLE pharmacy_branch_invites           IS 'Invite tokens for branch pharmacies created by parent pharmacies';

DO $comment_pharmacy_admin_create_branch$
DECLARE
  r regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO r
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'pharmacy_admin_create_branch'
    AND n.nspname = 'public'
    AND p.pronargs = 22;

  IF r IS NOT NULL THEN
    EXECUTE format(
      'COMMENT ON FUNCTION %s IS %L',
      r,
      'Parent pharmacy creates a branch invitation'
    );
  END IF;
END $comment_pharmacy_admin_create_branch$;
COMMENT ON FUNCTION verify_branch_invite           IS 'Validates a branch invite token and returns pharmacy details';
COMMENT ON FUNCTION complete_branch_setup          IS 'Completes branch setup: creates pharmacy record with parent link';
COMMENT ON FUNCTION get_pharmacy_branches          IS 'Lists all branches for a parent pharmacy with search/pagination';
COMMENT ON FUNCTION get_branch_pharmacy_detail     IS 'Gets full branch detail including roles and permissions';
COMMENT ON FUNCTION update_branch_pharmacy_status  IS 'Activates or suspends a branch pharmacy';
COMMENT ON FUNCTION resend_branch_invite           IS 'Regenerates token and extends expiry for a pending branch invite';
COMMENT ON FUNCTION get_pending_branch_invites     IS 'Lists pending branch invites for a parent pharmacy';
COMMENT ON FUNCTION create_pharmacy_role           IS 'Creates a custom role with permissions for a parent pharmacy';
COMMENT ON FUNCTION update_pharmacy_role           IS 'Updates role name, description, and/or permissions';
COMMENT ON FUNCTION delete_pharmacy_role           IS 'Deletes a role and all its assignments';
COMMENT ON FUNCTION list_pharmacy_roles            IS 'Lists all roles for a parent pharmacy with permission details';
COMMENT ON FUNCTION get_pharmacy_role_detail       IS 'Gets a single role with permissions and assigned branches';
COMMENT ON FUNCTION assign_role_to_branch          IS 'Assigns a role to a branch pharmacy';
COMMENT ON FUNCTION remove_role_from_branch        IS 'Removes a role assignment from a branch pharmacy';
COMMENT ON FUNCTION list_all_pharmacy_permissions  IS 'Returns the master list of all available permissions';
COMMENT ON FUNCTION get_branch_effective_permissions IS 'Returns effective permissions for a pharmacy (all for parent, role-based for branch)';
COMMENT ON FUNCTION get_pharmacy_context           IS 'Returns full context: parent/branch status, branches list, permissions, roles';
COMMENT ON FUNCTION verify_pharmacy_switch_access  IS 'Validates that a parent pharmacy can switch to a specific branch';
