-- ============================================================
-- Table   : public.buying_group_domains
-- ============================================================

DROP TABLE IF EXISTS public."buying_group_domains" CASCADE;

CREATE TABLE public."buying_group_domains" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "buying_group_id" uuid NOT NULL,
    "domain" varchar(255) NOT NULL,
    "admin_hostname" varchar(255) DEFAULT NULL::character varying,
    "pharmacy_hostname" varchar(255) DEFAULT NULL::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "buying_group_domains_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."buying_group_domains"
    ADD CONSTRAINT "buying_group_domains_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE CASCADE;

ALTER TABLE public."buying_group_domains"
    ADD CONSTRAINT "buying_group_domains_domain_key" UNIQUE (domain);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS buying_group_domains_domain_key ON public.buying_group_domains USING btree (domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_admin_hostname ON public.buying_group_domains USING btree (admin_hostname) WHERE (admin_hostname IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bgd_buying_group_id ON public.buying_group_domains USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_bgd_domain ON public.buying_group_domains USING btree (domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_pharmacy_hostname ON public.buying_group_domains USING btree (pharmacy_hostname) WHERE (pharmacy_hostname IS NOT NULL);

-- Row Level Security
ALTER TABLE public."buying_group_domains" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."buying_group_domains";
CREATE POLICY "all policy"
    ON public."buying_group_domains"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_buying_group_domains" ON public."buying_group_domains";
CREATE POLICY "service_role_all_buying_group_domains"
    ON public."buying_group_domains"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

