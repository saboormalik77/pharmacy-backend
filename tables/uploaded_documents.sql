-- ============================================================
-- Table   : public.uploaded_documents
-- ============================================================

DROP TABLE IF EXISTS public."uploaded_documents" CASCADE;

CREATE TABLE public."uploaded_documents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "file_name" varchar(500) NOT NULL,
    "file_size" bigint NOT NULL,
    "file_type" varchar(100),
    "file_url" text,
    "reverse_distributor_id" uuid,
    "source" varchar(50) DEFAULT 'manual_upload'::character varying,
    "status" varchar(50) DEFAULT 'uploading'::character varying,
    "uploaded_at" timestamptz DEFAULT now(),
    "processed_at" timestamptz,
    "error_message" text,
    "extracted_items" integer DEFAULT 0,
    "total_credit_amount" numeric,
    "processing_progress" integer DEFAULT 0,
    "report_date" date,
    CONSTRAINT "uploaded_documents_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_source_check" CHECK (source::text = ANY (ARRAY['manual_upload'::character varying, 'email_forward'::character varying, 'portal_fetch'::character varying, 'api'::character varying]::text[]));

ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_status_check" CHECK (status::text = ANY (ARRAY['uploading'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'needs_review'::character varying]::text[]));

ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_reverse_distributor_id_fkey" FOREIGN KEY (reverse_distributor_id) REFERENCES reverse_distributors(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_pharmacy_id ON public.uploaded_documents USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_report_date ON public.uploaded_documents USING btree (report_date);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_reverse_distributor_id ON public.uploaded_documents USING btree (reverse_distributor_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status ON public.uploaded_documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_uploaded_at ON public.uploaded_documents USING btree (uploaded_at);

-- Policies
DROP POLICY IF EXISTS "service_role_all_uploaded_documents" ON public."uploaded_documents";
CREATE POLICY "service_role_all_uploaded_documents"
    ON public."uploaded_documents"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

