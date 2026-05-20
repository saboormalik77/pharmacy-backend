-- ============================================================
-- Table   : public.processor_store_assignments
-- ============================================================

DROP TABLE IF EXISTS public."processor_store_assignments" CASCADE;

CREATE TABLE public."processor_store_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "processor_id" uuid NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "assigned_date" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "processor_store_assignments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processor_store_assignments"
    ADD CONSTRAINT "processor_store_assignments_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."processor_store_assignments"
    ADD CONSTRAINT "processor_store_assignments_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE CASCADE;

ALTER TABLE public."processor_store_assignments"
    ADD CONSTRAINT "processor_store_assignments_processor_id_pharmacy_id_key" UNIQUE (processor_id, pharmacy_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_psa_pharmacy ON public.processor_store_assignments USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_psa_processor ON public.processor_store_assignments USING btree (processor_id);
CREATE UNIQUE INDEX IF NOT EXISTS processor_store_assignments_processor_id_pharmacy_id_key ON public.processor_store_assignments USING btree (processor_id, pharmacy_id);

-- Row Level Security
ALTER TABLE public."processor_store_assignments" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."processor_store_assignments";
CREATE POLICY "all policy"
    ON public."processor_store_assignments"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_processor_assignments" ON public."processor_store_assignments";
CREATE POLICY "service_role_all_processor_assignments"
    ON public."processor_store_assignments"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

