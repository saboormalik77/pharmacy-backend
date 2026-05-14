-- ============================================================
-- Table   : public.return_transactions
-- ============================================================

DROP TABLE IF EXISTS public."return_transactions" CASCADE;

CREATE TABLE public."return_transactions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "license_plate" varchar(25) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "processor_id" uuid,
    "service_type" text DEFAULT 'in_store'::text NOT NULL,
    "status" text DEFAULT 'in_progress'::text NOT NULL,
    "fedex_tracking" text,
    "fedex_pickup_confirmation" text,
    "total_items" integer DEFAULT 0 NOT NULL,
    "total_returnable_value" numeric DEFAULT 0 NOT NULL,
    "total_non_returnable_value" numeric DEFAULT 0 NOT NULL,
    "batch_id" uuid,
    "time_in" timestamptz,
    "time_out" timestamptz,
    "received_in_warehouse_date" timestamptz,
    "finalized_at" timestamptz,
    "verified_integrity" boolean DEFAULT false,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "box_count" integer,
    "manifest_generated_at" timestamptz,
    "verified_at" timestamptz,
    "verified_by" uuid,
    "pieces_received" integer,
    "prp_number" text,
    "package_tracking" jsonb,
    "fedex_shipment_id" text,
    "fedex_labels" jsonb,
    "scanned_packages" jsonb,
    "finalize_steps" jsonb DEFAULT '{"fedexEntered": false, "printManifest": false, "printJobSheets": false}'::jsonb,
    "verification_completed_at" timestamptz,
    CONSTRAINT "return_transactions_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_service_type_check" CHECK (service_type = ANY (ARRAY['in_store'::text, 'self_service'::text, 'express'::text]));

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_status_check" CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'finalized'::text, 'scanning'::text, 'received'::text, 'verified'::text, 'closed'::text]));

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE SET NULL;

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_license_plate_key" UNIQUE (license_plate);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rt_batch ON public.return_transactions USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_rt_created_at ON public.return_transactions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rt_license_plate ON public.return_transactions USING btree (license_plate);
CREATE INDEX IF NOT EXISTS idx_rt_pharmacy ON public.return_transactions USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_rt_processor ON public.return_transactions USING btree (processor_id);
CREATE INDEX IF NOT EXISTS idx_rt_status ON public.return_transactions USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS return_transactions_license_plate_key ON public.return_transactions USING btree (license_plate);

-- Row Level Security
ALTER TABLE public."return_transactions" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."return_transactions";
CREATE POLICY "all policy"
    ON public."return_transactions"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_return_transactions" ON public."return_transactions";
CREATE POLICY "service_role_all_return_transactions"
    ON public."return_transactions"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

