-- ============================================================
-- Table   : public.service_requests
-- ============================================================

DROP TABLE IF EXISTS public."service_requests" CASCADE;

CREATE TABLE public."service_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "branch_id" uuid,
    "requested_by_user_id" uuid,
    "buying_group_id" uuid,
    "requested_date" date NOT NULL,
    "purpose" text,
    "special_instructions" text,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "scheduled_date" date,
    "claimed_by_processor_id" uuid,
    "claimed_at" timestamptz,
    "scheduler_notes" text,
    "completed_at" timestamptz,
    "completion_notes" text,
    "cancelled_at" timestamptz,
    "cancelled_reason" text,
    "cancelled_by" text,
    "cancelled_by_id" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "service_requests_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_cancelled_by_check" CHECK (cancelled_by = ANY (ARRAY['pharmacy'::text, 'processor'::text, 'admin'::text]));

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_purpose_check" CHECK (purpose IS NULL OR (purpose = ANY (ARRAY['return_pickup'::text, 'training'::text, 'inventory_review'::text, 'destruction_pickup'::text, 'other'::text])));

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text]));

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES pharmacy(id) ON DELETE SET NULL;

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_claimed_by_processor_id_fkey" FOREIGN KEY (claimed_by_processor_id) REFERENCES processors(id) ON DELETE SET NULL;

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_branch_id ON public.service_requests USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_buying_group ON public.service_requests USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_claimed_by ON public.service_requests USING btree (claimed_by_processor_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_pharmacy_id ON public.service_requests USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests USING btree (status);

-- Row Level Security
ALTER TABLE public."service_requests" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."service_requests";
CREATE POLICY "Allow all access via service role"
    ON public."service_requests"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true);

DROP POLICY IF EXISTS "service_role_all" ON public."service_requests";
CREATE POLICY "service_role_all"
    ON public."service_requests"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

