-- ============================================================
-- Table   : public.sub_main_admin
-- ============================================================

DROP TABLE IF EXISTS public."sub_main_admin" CASCADE;

CREATE TABLE public."sub_main_admin" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" text,
    "name" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'sub_admin'::character varying NOT NULL,
    "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "is_active" boolean DEFAULT true,
    "invite_token" text,
    "invite_expires_at" timestamptz,
    "invite_accepted_at" timestamptz,
    "created_by" uuid,
    "last_login_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "sub_main_admin_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_role_check" CHECK (role::text = ANY (ARRAY['main_admin'::character varying, 'sub_admin'::character varying]::text[]));

ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_created_by_fkey" FOREIGN KEY (created_by) REFERENCES main_admin(id) ON DELETE SET NULL;

ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_email_key" UNIQUE (email);

ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_invite_token_key" UNIQUE (invite_token);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_created_by ON public.sub_main_admin USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_email ON public.sub_main_admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_invite_token ON public.sub_main_admin USING btree (invite_token);
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_is_active ON public.sub_main_admin USING btree (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS sub_main_admin_email_key ON public.sub_main_admin USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS sub_main_admin_invite_token_key ON public.sub_main_admin USING btree (invite_token);

-- Row Level Security
ALTER TABLE public."sub_main_admin" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."sub_main_admin";
CREATE POLICY "all policy"
    ON public."sub_main_admin"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_sub_main_admin" ON public."sub_main_admin";
CREATE POLICY "service_role_all_sub_main_admin"
    ON public."sub_main_admin"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

