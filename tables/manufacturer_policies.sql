-- ============================================================
-- Table   : public.manufacturer_policies
-- ============================================================

DROP TABLE IF EXISTS public."manufacturer_policies" CASCADE;

CREATE TABLE public."manufacturer_policies" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "labeler_id" varchar(10) NOT NULL,
    "labeler_type" text DEFAULT 'generic'::text NOT NULL,
    "manufacturer_name" text NOT NULL,
    "address_1" text,
    "address_2" text,
    "city" text,
    "state" text,
    "zip" text,
    "main_contact" text,
    "main_phone" text,
    "fax" text,
    "credit_request_email" text,
    "contact_2_name" text,
    "contact_2_phone" text,
    "contact_2_email" text,
    "average_pay_percent" numeric,
    "average_days_to_pay" integer,
    "verified_date" date,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "manufacturer_policies_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."manufacturer_policies"
    ADD CONSTRAINT "manufacturer_policies_labeler_type_check" CHECK (labeler_type = ANY (ARRAY['generic'::text, 'brand'::text]));

ALTER TABLE public."manufacturer_policies"
    ADD CONSTRAINT "manufacturer_policies_labeler_id_key" UNIQUE (labeler_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_labeler_id ON public.manufacturer_policies USING btree (labeler_id);
CREATE INDEX IF NOT EXISTS idx_mp_manufacturer_name ON public.manufacturer_policies USING btree (manufacturer_name);
CREATE UNIQUE INDEX IF NOT EXISTS manufacturer_policies_labeler_id_key ON public.manufacturer_policies USING btree (labeler_id);

-- Row Level Security
ALTER TABLE public."manufacturer_policies" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."manufacturer_policies";
CREATE POLICY "all policy"
    ON public."manufacturer_policies"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_manufacturer_policies" ON public."manufacturer_policies";
CREATE POLICY "service_role_all_manufacturer_policies"
    ON public."manufacturer_policies"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

