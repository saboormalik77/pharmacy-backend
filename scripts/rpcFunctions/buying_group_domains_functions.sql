-- ============================================================
-- Multi-Tenant Domain-Based Access Control
-- 
-- Implements:
--   1. buying_group_domains table (maps hostnames -> buying groups)
--   2. buying_group_id column on admin table (for sub-admins / processors)
--   3. buying_group_id column on processors table (convenience scoping)
--   4. Backfill for existing super_admin rows
--   5. RPCs for domain resolution and management
--   6. RPCs for tenant validation at login time (admin + pharmacy)
-- 
-- All tenant checks are performed inside RPCs — the backend only passes
-- identifiers and receives a jsonb { error, message, buying_group_id }.
-- ============================================================


-- ============================================================
-- 1. TABLE: buying_group_domains
-- ============================================================

CREATE TABLE IF NOT EXISTS public.buying_group_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  buying_group_id UUID NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,

  domain VARCHAR(255) NOT NULL UNIQUE,

  admin_hostname VARCHAR(255) DEFAULT NULL,

  pharmacy_hostname VARCHAR(255) DEFAULT NULL,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_admin_hostname
  ON buying_group_domains(admin_hostname) WHERE admin_hostname IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_pharmacy_hostname
  ON buying_group_domains(pharmacy_hostname) WHERE pharmacy_hostname IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bgd_buying_group_id ON buying_group_domains(buying_group_id);
CREATE INDEX IF NOT EXISTS idx_bgd_domain ON buying_group_domains(domain);

ALTER TABLE buying_group_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON buying_group_domains;
CREATE POLICY "Service role full access" ON buying_group_domains
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_bgd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bgd_updated_at ON buying_group_domains;
CREATE TRIGGER trg_bgd_updated_at
  BEFORE UPDATE ON buying_group_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_bgd_updated_at();


-- ============================================================
-- 2. ALTER TABLE: admin — add buying_group_id
-- super_admin rows ARE the buying group (self-referencing)
-- sub-admins / processors (role='processor') point to their super_admin
-- ============================================================

ALTER TABLE admin
  ADD COLUMN IF NOT EXISTS buying_group_id UUID REFERENCES admin(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_buying_group_id ON admin(buying_group_id);

UPDATE admin
SET buying_group_id = id
WHERE role = 'super_admin' AND buying_group_id IS NULL;


-- ============================================================
-- 3. ALTER TABLE: processors — add buying_group_id
-- ============================================================

ALTER TABLE processors
  ADD COLUMN IF NOT EXISTS buying_group_id UUID REFERENCES admin(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processors_buying_group_id ON processors(buying_group_id);

-- Backfill processors.buying_group_id from the admin row they are linked to
UPDATE processors p
SET buying_group_id = a.buying_group_id
FROM admin a
WHERE p.admin_user_id = a.id
  AND p.buying_group_id IS NULL
  AND a.buying_group_id IS NOT NULL;


-- ============================================================
-- 4. RPC: resolve_domain_to_buying_group
-- Called on every login and on /auth/tenant-info.
-- Returns the tenant for the given hostname, or an error envelope.
--
-- p_role_hint: optional 'admin' or 'pharmacy' to restrict matching:
--   - 'admin'    -> only match admin_hostname
--   - 'pharmacy' -> only match pharmacy_hostname
--   - NULL       -> match any of admin_hostname, pharmacy_hostname, or domain
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_domain_to_buying_group(
  p_hostname TEXT,
  p_role_hint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_hostname TEXT;
  v_role TEXT;
BEGIN
  v_hostname := LOWER(TRIM(p_hostname));
  v_role := LOWER(TRIM(p_role_hint));

  IF v_hostname IS NULL OR v_hostname = '' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Hostname is required');
  END IF;

  SELECT jsonb_build_object(
    'buying_group_id', bgd.buying_group_id,
    'domain', bgd.domain,
    'portal_type',
      CASE
        WHEN v_role = 'admin' THEN 'admin'
        WHEN v_role = 'pharmacy' THEN 'pharmacy'
        WHEN v_hostname = bgd.admin_hostname THEN 'admin'
        WHEN v_hostname = bgd.pharmacy_hostname THEN 'pharmacy'
        ELSE 'unknown'
      END,
    'is_active', bgd.is_active,
    'buying_group_name', a.name
  )
  INTO v_result
  FROM buying_group_domains bgd
  JOIN admin a ON a.id = bgd.buying_group_id
  WHERE bgd.is_active = true
    AND a.is_active = true
    AND (
      -- When role hint is provided, only match the corresponding column
      (v_role = 'admin' AND bgd.admin_hostname = v_hostname)
      OR (v_role = 'pharmacy' AND bgd.pharmacy_hostname = v_hostname)
      -- When no role hint, match any column
      OR (v_role IS NULL AND (
        bgd.admin_hostname = v_hostname
        OR bgd.pharmacy_hostname = v_hostname
        OR bgd.domain = v_hostname
      ))
    )
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Domain not recognized');
  END IF;

  RETURN jsonb_build_object('error', false, 'data', v_result);
END;
$$;


-- ============================================================
-- 5. Helper function: clean_hostname
-- Strips protocol (http://, https://), trailing slashes, ports, and paths
-- ============================================================

CREATE OR REPLACE FUNCTION clean_hostname(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_result := LOWER(TRIM(p_input));
  
  -- Remove protocol prefix
  v_result := REGEXP_REPLACE(v_result, '^https?://', '');
  
  -- Remove trailing slashes
  v_result := REGEXP_REPLACE(v_result, '/+$', '');
  
  -- Remove any path after the hostname
  v_result := SPLIT_PART(v_result, '/', 1);
  
  -- Remove port if present
  v_result := SPLIT_PART(v_result, ':', 1);
  
  -- Return NULL if empty
  IF v_result = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN v_result;
END;
$$;


-- ============================================================
-- 6. RPC: upsert_buying_group_domain (for MainAdmin)
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_buying_group_domain(
  p_buying_group_id UUID,
  p_domain TEXT,
  p_admin_hostname TEXT DEFAULT NULL,
  p_pharmacy_hostname TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_domain TEXT;
  v_admin_host TEXT;
  v_pharmacy_host TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_buying_group_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  -- Clean all hostnames: strip protocol, paths, ports
  v_domain := clean_hostname(p_domain);
  v_admin_host := clean_hostname(p_admin_hostname);
  v_pharmacy_host := clean_hostname(p_pharmacy_hostname);

  IF v_domain IS NULL OR v_domain = '' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Domain is required');
  END IF;

  INSERT INTO buying_group_domains (buying_group_id, domain, admin_hostname, pharmacy_hostname)
  VALUES (p_buying_group_id, v_domain, v_admin_host, v_pharmacy_host)
  ON CONFLICT (domain) DO UPDATE SET
    buying_group_id   = EXCLUDED.buying_group_id,
    admin_hostname    = COALESCE(EXCLUDED.admin_hostname, buying_group_domains.admin_hostname),
    pharmacy_hostname = COALESCE(EXCLUDED.pharmacy_hostname, buying_group_domains.pharmacy_hostname),
    updated_at        = NOW()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('error', false, 'message', 'Domain configured', 'id', v_id);
END;
$$;


-- ============================================================
-- 7. RPC: get_buying_group_domains (for MainAdmin)
-- ============================================================

CREATE OR REPLACE FUNCTION get_buying_group_domains(p_buying_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', bgd.id,
      'domain', bgd.domain,
      'adminHostname', bgd.admin_hostname,
      'pharmacyHostname', bgd.pharmacy_hostname,
      'isActive', bgd.is_active,
      'createdAt', bgd.created_at,
      'updatedAt', bgd.updated_at
    ) ORDER BY bgd.created_at DESC)
    FROM buying_group_domains bgd
    WHERE bgd.buying_group_id = p_buying_group_id),
    '[]'::jsonb
  );
END;
$$;


-- ============================================================
-- 8. RPC: delete_buying_group_domain (for MainAdmin)
-- ============================================================

CREATE OR REPLACE FUNCTION delete_buying_group_domain(p_domain_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows INT;
BEGIN
  DELETE FROM buying_group_domains WHERE id = p_domain_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Domain not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'message', 'Domain deleted');
END;
$$;


-- ============================================================
-- 9. RPC: validate_admin_tenant_access
-- Performs the tenant-based access control for admin/processor logins.
-- Returns:
--   { error: false, buying_group_id: uuid }  when allowed
--   { error: true,  message: text, code: int } when denied
--
-- Rules:
--   - super_admin : admin.id MUST equal p_tenant_buying_group_id
--   - other roles : admin.buying_group_id MUST equal p_tenant_buying_group_id
--   - If p_tenant_buying_group_id IS NULL: no enforcement (localhost path)
--     and the function returns the admin's own resolved buying_group_id
--     so the backend can embed it in the JWT.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_admin_tenant_access(
  p_admin_id UUID,
  p_tenant_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_admin_bg UUID;
  v_resolved_bg UUID;
BEGIN
  SELECT role, buying_group_id
    INTO v_role, v_admin_bg
  FROM admin
  WHERE id = p_admin_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Admin not found', 'code', 404);
  END IF;

  -- The buying_group_id this admin effectively belongs to
  IF v_role = 'super_admin' THEN
    v_resolved_bg := p_admin_id;
  ELSE
    v_resolved_bg := v_admin_bg;
  END IF;

  -- If a tenant context is present, enforce it
  IF p_tenant_buying_group_id IS NOT NULL THEN
    IF v_resolved_bg IS NULL OR v_resolved_bg <> p_tenant_buying_group_id THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'You do not have access to this portal',
        'code', 403
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'buying_group_id', v_resolved_bg
  );
END;
$$;


-- ============================================================
-- 10. RPC: validate_pharmacy_tenant_access
-- Performs tenant-based access control for pharmacy logins.
-- Returns:
--   { error: false, buying_group_id: uuid }
--   { error: true,  message: text, code: int }
-- ============================================================

CREATE OR REPLACE FUNCTION validate_pharmacy_tenant_access(
  p_pharmacy_id UUID,
  p_tenant_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_by UUID;
BEGIN
  SELECT created_by
    INTO v_created_by
  FROM pharmacy
  WHERE id = p_pharmacy_id;

  -- NOTE: pharmacy rows are not required to have created_by populated
  -- historically. When no tenant enforcement is required, we still return
  -- whatever value is present (can be NULL).

  IF p_tenant_buying_group_id IS NOT NULL THEN
    IF v_created_by IS NULL OR v_created_by <> p_tenant_buying_group_id THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'You do not have access to this portal',
        'code', 403
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'buying_group_id', v_created_by
  );
END;
$$;


-- ============================================================
-- 11. GRANTS
-- ============================================================

-- Two-arg signature: defaults do not create a separate (text-only) overload in pg_proc.
GRANT EXECUTE ON FUNCTION resolve_domain_to_buying_group(TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION upsert_buying_group_domain(UUID, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_buying_group_domains(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_buying_group_domain(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION validate_admin_tenant_access(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION validate_pharmacy_tenant_access(UUID, UUID) TO authenticated, anon, service_role;
