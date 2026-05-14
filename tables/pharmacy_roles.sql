-- ============================================================
-- Table   : public.pharmacy_roles
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_roles" CASCADE;

CREATE TABLE public."pharmacy_roles" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "parent_pharmacy_id" uuid NOT NULL,
    "role_name" text NOT NULL,
    "description" text,
    "is_default" boolean DEFAULT false,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_roles_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_roles"
    ADD CONSTRAINT "pharmacy_roles_parent_pharmacy_id_fkey" FOREIGN KEY (parent_pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_roles"
    ADD CONSTRAINT "pharmacy_roles_parent_pharmacy_id_role_name_key" UNIQUE (parent_pharmacy_id, role_name);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_roles_parent ON public.pharmacy_roles USING btree (parent_pharmacy_id);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_roles_parent_pharmacy_id_role_name_key ON public.pharmacy_roles USING btree (parent_pharmacy_id, role_name);

-- Row Level Security
ALTER TABLE public."pharmacy_roles" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_roles" ON public."pharmacy_roles";
CREATE POLICY "Service role full access on pharmacy_roles"
    ON public."pharmacy_roles"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_roles";
CREATE POLICY "all policy"
    ON public."pharmacy_roles"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

