-- ============================================================
-- Table   : public.admin
-- ============================================================

DROP TABLE IF EXISTS public."admin" CASCADE;

CREATE TABLE public."admin" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" text NOT NULL,
    "name" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'support'::character varying,
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "reset_token" text,
    "reset_token_expires_at" timestamptz,
    "permissions" jsonb DEFAULT '[]'::jsonb,
    "buying_group_id" uuid,
    "address" text,
    "contact_phone" text,
    "notes" text,
    "supabase_url" text,
    "supabase_anon_key" text,
    "supabase_service_role_key" text,
    "supabase_enabled" boolean DEFAULT false,
    CONSTRAINT "admin_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."admin"
    ADD CONSTRAINT "admin_role_check" CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'manager'::character varying, 'reviewer'::character varying, 'support'::character varying, 'processor'::character varying, 'warehouse_staff'::character varying, 'sales_rep'::character varying]::text[]));

ALTER TABLE public."admin"
    ADD CONSTRAINT "admin_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."admin"
    ADD CONSTRAINT "admin_email_key" UNIQUE (email);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS admin_email_key ON public.admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_admin_buying_group_id ON public.admin USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_admin_is_active ON public.admin USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_admin_reset_token ON public.admin USING btree (reset_token) WHERE (reset_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin USING btree (role);

-- Row Level Security
ALTER TABLE public."admin" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."admin";
CREATE POLICY "Allow all access via service role"
    ON public."admin"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for anon users" ON public."admin";
CREATE POLICY "Enable read access for anon users"
    ON public."admin"
    AS PERMISSIVE
    FOR SELECT TO 16480
    USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public."admin";
CREATE POLICY "Enable read access for authenticated users"
    ON public."admin"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (true);

DROP POLICY IF EXISTS "all policy" ON public."admin";
CREATE POLICY "all policy"
    ON public."admin"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

