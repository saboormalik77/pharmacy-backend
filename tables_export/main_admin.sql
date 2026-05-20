-- ============================================================
-- Table   : public.main_admin
-- ============================================================

DROP TABLE IF EXISTS public."main_admin" CASCADE;

CREATE TABLE public."main_admin" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" text NOT NULL,
    "name" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "main_admin_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."main_admin"
    ADD CONSTRAINT "main_admin_email_key" UNIQUE (email);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_main_admin_email ON public.main_admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_main_admin_is_active ON public.main_admin USING btree (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS main_admin_email_key ON public.main_admin USING btree (email);

-- Row Level Security
ALTER TABLE public."main_admin" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."main_admin";
CREATE POLICY "all policy"
    ON public."main_admin"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_main_admin" ON public."main_admin";
CREATE POLICY "service_role_all_main_admin"
    ON public."main_admin"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

