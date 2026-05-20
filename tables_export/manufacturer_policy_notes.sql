-- ============================================================
-- Table   : public.manufacturer_policy_notes
-- ============================================================

DROP TABLE IF EXISTS public."manufacturer_policy_notes" CASCADE;

CREATE TABLE public."manufacturer_policy_notes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "manufacturer_policy_id" uuid NOT NULL,
    "note_date" date DEFAULT CURRENT_DATE NOT NULL,
    "author_initials" varchar(10),
    "note_text" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "manufacturer_policy_notes_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."manufacturer_policy_notes"
    ADD CONSTRAINT "manufacturer_policy_notes_manufacturer_policy_id_fkey" FOREIGN KEY (manufacturer_policy_id) REFERENCES manufacturer_policies(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mpn_policy_id ON public.manufacturer_policy_notes USING btree (manufacturer_policy_id);

-- Row Level Security
ALTER TABLE public."manufacturer_policy_notes" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."manufacturer_policy_notes";
CREATE POLICY "all policy"
    ON public."manufacturer_policy_notes"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_manufacturer_policy_notes" ON public."manufacturer_policy_notes";
CREATE POLICY "service_role_all_manufacturer_policy_notes"
    ON public."manufacturer_policy_notes"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

