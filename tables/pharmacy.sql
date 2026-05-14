-- ============================================================
-- Table   : public.pharmacy
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy" CASCADE;

CREATE TABLE public."pharmacy" (
    "id" uuid NOT NULL,
    "email" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "pharmacy_name" varchar(255) NOT NULL,
    "phone" varchar(20),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "npi_number" varchar(50),
    "dea_number" varchar(50),
    "status" varchar(20) DEFAULT 'pending'::character varying,
    "physical_address" jsonb,
    "billing_address" jsonb,
    "contact_phone" varchar(20),
    "subscription_tier" varchar(20) DEFAULT 'free'::character varying,
    "subscription_status" varchar(20) DEFAULT 'trial'::character varying,
    "state_license_number" varchar(100),
    "license_expiry_date" date,
    "trial_ends_at" timestamptz,
    "fcm_token" text,
    "store_number" varchar(10),
    "primary_wholesaler" text,
    "wholesaler_account_number" text,
    "secondary_wholesaler" text,
    "gpo_affiliation" text,
    "service_type" text DEFAULT 'full_service'::text,
    "assigned_processor_id" uuid,
    "assigned_sales_person_id" uuid,
    "last_visit_date" date,
    "next_visit_date" date,
    "days_between_visits" integer DEFAULT 120,
    "dea_expiration_date" date,
    "fax_number" text,
    "parent_pharmacy_id" uuid,
    "can_manage_branches" boolean DEFAULT false,
    "created_by" uuid,
    "corporate_name" text,
    "dea_file_url" text,
    "license_file_url" text,
    "mailing_address" text,
    "store_hours" text,
    CONSTRAINT "pharmacy_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_service_type_check" CHECK (service_type = ANY (ARRAY['full_service'::text, 'self_service'::text, 'express'::text]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'suspended'::character varying, 'blacklisted'::character varying]::text[]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_subscription_status_check" CHECK (subscription_status::text = ANY (ARRAY['active'::character varying, 'trial'::character varying, 'expired'::character varying, 'cancelled'::character varying, 'past_due'::character varying]::text[]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_subscription_tier_check" CHECK (subscription_tier::text = ANY (ARRAY['free'::character varying, 'basic'::character varying, 'premium'::character varying, 'enterprise'::character varying]::text[]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "fk_pharmacy_assigned_processor" FOREIGN KEY (assigned_processor_id) REFERENCES processors(id) ON DELETE SET NULL;

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_created_by_fkey" FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_parent_pharmacy_id_fkey" FOREIGN KEY (parent_pharmacy_id) REFERENCES pharmacy(id);

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_email_key" UNIQUE (email);

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_store_number_key" UNIQUE (store_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_assigned_processor ON public.pharmacy USING btree (assigned_processor_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_created_by ON public.pharmacy USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_pharmacy_email ON public.pharmacy USING btree (email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_fcm_token ON public.pharmacy USING btree (fcm_token) WHERE (fcm_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pharmacy_parent_id ON public.pharmacy USING btree (parent_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_store_number ON public.pharmacy USING btree (store_number);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_email_key ON public.pharmacy USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_store_number_key ON public.pharmacy USING btree (store_number);

-- Row Level Security
ALTER TABLE public."pharmacy" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow service role full access" ON public."pharmacy";
CREATE POLICY "Allow service role full access"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to delete own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to delete own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR DELETE TO 16481
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to insert own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR INSERT TO 16481
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to read own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to read own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to update own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR UPDATE TO 16481
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Pharmacies can update own record" ON public."pharmacy";
CREATE POLICY "Pharmacies can update own record"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR UPDATE TO public
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Pharmacies can view own record" ON public."pharmacy";
CREATE POLICY "Pharmacies can view own record"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR SELECT TO public
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role has full access" ON public."pharmacy";
CREATE POLICY "Service role has full access"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR ALL TO public
    USING ((current_setting('request.jwt.claims'::text, true)::json ->> 'role'::text) = 'service_role'::text OR auth.uid() = id);

