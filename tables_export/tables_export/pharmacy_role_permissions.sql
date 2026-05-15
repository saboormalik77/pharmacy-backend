-- ============================================================
-- Table   : public.pharmacy_role_permissions
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_role_permissions" CASCADE;

CREATE TABLE public."pharmacy_role_permissions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "role_id" uuid NOT NULL,
    "permission_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_role_permissions_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_role_permissions"
    ADD CONSTRAINT "pharmacy_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES pharmacy_permissions(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_role_permissions"
    ADD CONSTRAINT "pharmacy_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES pharmacy_roles(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_role_permissions"
    ADD CONSTRAINT "pharmacy_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_role_perms_role ON public.pharmacy_role_permissions USING btree (role_id);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_role_permissions_role_id_permission_id_key ON public.pharmacy_role_permissions USING btree (role_id, permission_id);

-- Row Level Security
ALTER TABLE public."pharmacy_role_permissions" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_role_permissions" ON public."pharmacy_role_permissions";
CREATE POLICY "Service role full access on pharmacy_role_permissions"
    ON public."pharmacy_role_permissions"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_role_permissions";
CREATE POLICY "all policy"
    ON public."pharmacy_role_permissions"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

