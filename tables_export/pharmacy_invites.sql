-- ============================================================
-- Table   : public.pharmacy_invites
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_invites" CASCADE;

CREATE TABLE public."pharmacy_invites" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "invite_token" text NOT NULL,
    "email" text NOT NULL,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "completed_at" timestamptz,
    "created_by" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "pharmacy_name" text DEFAULT ''::text NOT NULL,
    "contact_name" text,
    "phone" text,
    "fax" text,
    "street" text,
    "city" text,
    "state" text,
    "zip" text,
    "wholesaler" text,
    "wholesaler_account" text,
    "dea_number" text,
    "dea_expiration" date,
    "service_type" text DEFAULT 'full_service'::text,
    "days_between_visits" integer DEFAULT 120,
    "last_visit_date" date,
    "next_visit_date" date,
    "processor_id" uuid,
    "sales_person_id" uuid,
    "secondary_wholesaler" text,
    CONSTRAINT "pharmacy_invites_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_invites"
    ADD CONSTRAINT "pharmacy_invites_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text]));

ALTER TABLE public."pharmacy_invites"
    ADD CONSTRAINT "pharmacy_invites_invite_token_key" UNIQUE (invite_token);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_email ON public.pharmacy_invites USING btree (email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_status ON public.pharmacy_invites USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_token ON public.pharmacy_invites USING btree (invite_token);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_invites_invite_token_key ON public.pharmacy_invites USING btree (invite_token);

-- Row Level Security
ALTER TABLE public."pharmacy_invites" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_invites" ON public."pharmacy_invites";
CREATE POLICY "Service role full access on pharmacy_invites"
    ON public."pharmacy_invites"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_invites";
CREATE POLICY "all policy"
    ON public."pharmacy_invites"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

