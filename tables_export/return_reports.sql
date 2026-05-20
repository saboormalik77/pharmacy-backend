-- ============================================================
-- Table   : public.return_reports
-- ============================================================

DROP TABLE IF EXISTS public."return_reports" CASCADE;

CREATE TABLE public."return_reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "document_id" uuid NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "data" jsonb NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "return_reports_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_reports"
    ADD CONSTRAINT "return_reports_document_id_fkey" FOREIGN KEY (document_id) REFERENCES uploaded_documents(id) ON DELETE CASCADE;

ALTER TABLE public."return_reports"
    ADD CONSTRAINT "return_reports_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_return_reports_created_at ON public.return_reports USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_return_reports_data_gin ON public.return_reports USING gin (data);
CREATE INDEX IF NOT EXISTS idx_return_reports_document_id ON public.return_reports USING btree (document_id);
CREATE INDEX IF NOT EXISTS idx_return_reports_pharmacy_id ON public.return_reports USING btree (pharmacy_id);

-- Policies
DROP POLICY IF EXISTS "service_role_all_return_reports" ON public."return_reports";
CREATE POLICY "service_role_all_return_reports"
    ON public."return_reports"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

