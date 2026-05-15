-- ============================================================
-- Table   : public.service_request_assignments
-- ============================================================

DROP TABLE IF EXISTS public."service_request_assignments" CASCADE;

CREATE TABLE public."service_request_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "service_request_id" uuid NOT NULL,
    "processor_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "service_request_assignments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."service_request_assignments"
    ADD CONSTRAINT "service_request_assignments_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE CASCADE;

ALTER TABLE public."service_request_assignments"
    ADD CONSTRAINT "service_request_assignments_service_request_id_fkey" FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE;

ALTER TABLE public."service_request_assignments"
    ADD CONSTRAINT "service_request_assignments_service_request_id_processor_id_key" UNIQUE (service_request_id, processor_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sra_processor_id ON public.service_request_assignments USING btree (processor_id);
CREATE INDEX IF NOT EXISTS idx_sra_service_request_id ON public.service_request_assignments USING btree (service_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS service_request_assignments_service_request_id_processor_id_key ON public.service_request_assignments USING btree (service_request_id, processor_id);

-- Row Level Security
ALTER TABLE public."service_request_assignments" ENABLE ROW LEVEL SECURITY;

