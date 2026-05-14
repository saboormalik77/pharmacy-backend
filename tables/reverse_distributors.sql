-- ============================================================
-- Table   : public.reverse_distributors
-- ============================================================

DROP TABLE IF EXISTS public."reverse_distributors" CASCADE;

CREATE TABLE public."reverse_distributors" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "code" varchar(50) NOT NULL,
    "contact_email" varchar(255),
    "contact_phone" varchar(20),
    "address" jsonb,
    "portal_url" text,
    "supported_formats" text[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "fee_rates" jsonb,
    "contact_person" text,
    "license_number" text,
    "specializations" text[] DEFAULT ARRAY[]::text[],
    CONSTRAINT "reverse_distributors_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."reverse_distributors"
    ADD CONSTRAINT "reverse_distributors_code_key" UNIQUE (code);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_active ON public.reverse_distributors USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_code ON public.reverse_distributors USING btree (code);
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_name ON public.reverse_distributors USING btree (name);
CREATE UNIQUE INDEX IF NOT EXISTS reverse_distributors_code_key ON public.reverse_distributors USING btree (code);

-- Policies
DROP POLICY IF EXISTS "service_role_all_reverse_distributors" ON public."reverse_distributors";
CREATE POLICY "service_role_all_reverse_distributors"
    ON public."reverse_distributors"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

