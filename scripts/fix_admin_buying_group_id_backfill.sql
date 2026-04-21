-- ============================================================
-- FIX: Backfill admin.buying_group_id for existing sub-admins
-- ============================================================
-- BUG: The original create_admin_user RPC did NOT accept or persist
-- `buying_group_id`, so every sub-admin (manager / reviewer / support)
-- created before this fix ended up with admin.buying_group_id = NULL.
--
-- Effect: those sub-admins log in, get JWT.buying_group_id = null,
-- and therefore `req.adminBuyingGroupId === null` in Express, which
-- the RPCs interpret as "MainAdmin scope → show everything".
-- That's why /api/admin/dashboard was returning global data instead
-- of the buying group's own data.
--
-- This script:
--   1. Ensures every super_admin row self-references itself.
--   2. Backfills sub-admins whose buying_group_id is NULL IFF there
--      is exactly ONE super_admin in the system (single-tenant
--      install). In multi-tenant installs, you must manually set
--      each admin's buying_group_id (see section 3).
-- ============================================================

BEGIN;

-- 1. Every super_admin row IS its own buying group.
UPDATE admin
SET buying_group_id = id,
    updated_at = NOW()
WHERE role = 'super_admin'
  AND (buying_group_id IS NULL OR buying_group_id <> id);

-- 2. Single-tenant backfill: if exactly one super_admin exists,
--    attach all orphan sub-admins to that group.
DO $$
DECLARE
  v_super_admin_count INTEGER;
  v_super_admin_id    UUID;
  v_updated           INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
    INTO v_super_admin_count
  FROM admin
  WHERE role = 'super_admin';

  IF v_super_admin_count = 1 THEN
    SELECT id INTO v_super_admin_id FROM admin WHERE role = 'super_admin' LIMIT 1;

    UPDATE admin
    SET buying_group_id = v_super_admin_id,
        updated_at = NOW()
    WHERE role IN ('manager', 'reviewer', 'support')
      AND buying_group_id IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Backfilled buying_group_id on % sub-admin row(s) -> %',
      v_updated, v_super_admin_id;
  ELSE
    RAISE NOTICE
      'Skipping automatic backfill: found % super_admins. '
      'For multi-tenant installs, set admin.buying_group_id '
      'manually for each sub-admin (see section 3 below).',
      v_super_admin_count;
  END IF;
END $$;

-- 3. Multi-tenant manual backfill template (uncomment + fill in):
--
--   UPDATE admin
--   SET buying_group_id = '<SUPER_ADMIN_UUID>',
--       updated_at      = NOW()
--   WHERE email IN (
--     'manager1@example.com',
--     'reviewer1@example.com'
--   );

-- 4. Verification: every non-MainAdmin non-super_admin row should
--    now have a buying_group_id.
DO $$
DECLARE
  v_orphans INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
    INTO v_orphans
  FROM admin
  WHERE role IN ('manager', 'reviewer', 'support')
    AND buying_group_id IS NULL;

  IF v_orphans > 0 THEN
    RAISE WARNING 'There are still % sub-admin row(s) with NULL buying_group_id. '
                  'These admins will behave as MainAdmins on login until fixed.',
                  v_orphans;
  ELSE
    RAISE NOTICE 'All sub-admin rows have a buying_group_id. ✔';
  END IF;
END $$;

COMMIT;
