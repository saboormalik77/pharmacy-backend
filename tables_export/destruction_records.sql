-- ============================================================
-- Table   : public.destruction_records
-- ============================================================

DROP TABLE IF EXISTS public."destruction_records" CASCADE;

CREATE TABLE public."destruction_records" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "transaction_item_id" uuid,
    "ndc" varchar(13),
    "product_name" text,
    "manufacturer" text,
    "lot_number" text,
    "quantity" integer DEFAULT 1,
    "weight_lbs" numeric,
    "destruction_reason" text DEFAULT 'non_returnable'::text NOT NULL,
    "status" USER-DEFINED DEFAULT 'pending'::destruction_status NOT NULL,
    "federal_form_number" text,
    "destruction_company" text,
    "scheduled_date" date,
    "picked_up_at" timestamptz,
    "destroyed_at" timestamptz,
    "form_url" text,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "destruction_records_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."destruction_records"
    ADD CONSTRAINT "destruction_records_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."destruction_records"
    ADD CONSTRAINT "destruction_records_transaction_item_id_fkey" FOREIGN KEY (transaction_item_id) REFERENCES return_transaction_items(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_destruction_records_created_at ON public.destruction_records USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_destruction_records_ndc ON public.destruction_records USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_destruction_records_pharmacy ON public.destruction_records USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_destruction_records_status ON public.destruction_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_destruction_records_transaction_item ON public.destruction_records USING btree (transaction_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_destruction_records_transaction_item ON public.destruction_records USING btree (transaction_item_id) WHERE (transaction_item_id IS NOT NULL);

-- Row Level Security
ALTER TABLE public."destruction_records" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."destruction_records";
CREATE POLICY "Allow all access via service role"
    ON public."destruction_records"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."destruction_records";
CREATE POLICY "all policy"
    ON public."destruction_records"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

