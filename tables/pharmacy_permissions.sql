-- ============================================================
-- Table   : public.pharmacy_permissions
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_permissions" CASCADE;

CREATE TABLE public."pharmacy_permissions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "permission_key" text NOT NULL,
    "module" text NOT NULL,
    "action" text NOT NULL,
    "display_name" text NOT NULL,
    "description" text,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_permissions_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_permissions"
    ADD CONSTRAINT "pharmacy_permissions_permission_key_key" UNIQUE (permission_key);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_permissions_permission_key_key ON public.pharmacy_permissions USING btree (permission_key);

-- Row Level Security
ALTER TABLE public."pharmacy_permissions" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_permissions" ON public."pharmacy_permissions";
CREATE POLICY "Service role full access on pharmacy_permissions"
    ON public."pharmacy_permissions"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_permissions";
CREATE POLICY "all policy"
    ON public."pharmacy_permissions"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

