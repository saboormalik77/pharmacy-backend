-- ============================================================
-- BUYING GROUPS ARCHITECTURE
-- ============================================================
-- The existing 'admin' table represents the buying groups
-- Each admin record is essentially a buying group with login credentials
-- The MainAdmin portal manages these admin records as "buying groups"
-- No separate buying_groups table is needed
-- ============================================================

-- No additional tables needed - using existing 'admin' table as buying groups
-- The 'admin' table already has:
-- - id, email, password_hash, name, role, is_active
-- - created_at, updated_at, last_login_at
-- - permissions (for admin portal access)

-- This file serves as documentation that we're using the admin table
-- as the buying groups that the MainAdmin portal manages