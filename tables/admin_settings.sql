-- ============================================================
-- Table   : public.admin_settings
-- ============================================================

DROP TABLE IF EXISTS public."admin_settings" CASCADE;

CREATE TABLE public."admin_settings" (
    "id" integer DEFAULT nextval('admin_settings_id_seq'::regclass) NOT NULL,
    "site_name" varchar(255) DEFAULT 'PharmAdmin'::character varying,
    "site_email" varchar(255) DEFAULT 'admin@pharmadmin.com'::character varying,
    "timezone" varchar(100) DEFAULT 'America/New_York'::character varying,
    "language" varchar(10) DEFAULT 'en'::character varying,
    "email_notifications" boolean DEFAULT true,
    "document_approval_notif" boolean DEFAULT true,
    "payment_notif" boolean DEFAULT true,
    "shipment_notif" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "warehouse_name" text,
    "warehouse_street" text,
    "warehouse_city" text,
    "warehouse_state" text,
    "warehouse_zip" text,
    "warehouse_country" text DEFAULT 'US'::text,
    "warehouse_phone" text,
    "warehouse_contact_name" text,
    "business_name" text,
    "logo_url" text,
    "buying_group_id" uuid,
    CONSTRAINT "admin_settings_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."admin_settings"
    ADD CONSTRAINT "admin_settings_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_settings_buying_group_id ON public.admin_settings USING btree (buying_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_buying_group ON public.admin_settings USING btree (buying_group_id) WHERE (buying_group_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_global ON public.admin_settings USING btree (id) WHERE (buying_group_id IS NULL);

-- Row Level Security
ALTER TABLE public."admin_settings" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access admin_settings" ON public."admin_settings";
CREATE POLICY "Service role can access admin_settings"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."admin_settings";
CREATE POLICY "all policy"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "allpolicy" ON public."admin_settings";
CREATE POLICY "allpolicy"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_admin_settings" ON public."admin_settings";
CREATE POLICY "service_role_all_admin_settings"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

