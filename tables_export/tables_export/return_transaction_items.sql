-- ============================================================
-- Table   : public.return_transaction_items
-- ============================================================

DROP TABLE IF EXISTS public."return_transaction_items" CASCADE;

CREATE TABLE public."return_transaction_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "transaction_id" uuid NOT NULL,
    "ndc" varchar(13),
    "ndc_10" varchar(12),
    "gtin" varchar(14),
    "proprietary_name" text,
    "generic_name" text,
    "manufacturer" text,
    "package_description" text,
    "dosage_form" text,
    "strength" text,
    "route" text,
    "lot_number" text,
    "serial_number" text,
    "expiration_date" date,
    "standard_price" numeric,
    "quantity" integer DEFAULT 1 NOT NULL,
    "full_package_size" integer,
    "is_partial" boolean DEFAULT false,
    "partial_percentage" numeric,
    "estimated_value" numeric,
    "return_status" text DEFAULT 'tbd'::text NOT NULL,
    "non_returnable_reason" text,
    "return_reason" text,
    "destination" text,
    "dea_schedule" text,
    "dea_form_222_required" boolean DEFAULT false,
    "product_type" text,
    "co_status" text DEFAULT 'no'::text,
    "bmp_status" text DEFAULT 'no'::text,
    "memo" text,
    "wine_cellar_id" uuid,
    "scan_source" text DEFAULT 'manual'::text,
    "raw_scan_data" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "verified" boolean DEFAULT false,
    "actual_quantity" integer,
    "condition_notes" text,
    "estimated_store_price" numeric,
    "estimated_store_value" numeric,
    "full_package_qty_returned" integer,
    "quantity_returned" integer,
    "verification_status" text,
    CONSTRAINT "return_transaction_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_bmp_status_check" CHECK (bmp_status = ANY (ARRAY['yes'::text, 'no'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_co_status_check" CHECK (co_status = ANY (ARRAY['yes'::text, 'no'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_non_returnable_reason_check" CHECK (non_returnable_reason IS NULL OR (non_returnable_reason = ANY (ARRAY['manufacturer_no_returns'::text, 'sold_non_returnable'::text, 'manufacturer_no_partials'::text, 'repackaged'::text, 'too_far_past_expiration'::text, 'minimum_quantity_not_met'::text, 'sample'::text, 'rx_label_on_product'::text, 'label_defaced_or_damaged'::text, 'lot_non_returnable'::text, 'minimum_value_not_met'::text, 'other'::text, 'free_complimentary'::text, 'not_in_original_package'::text, 'overfilled_container'::text, 'too_far_in_date'::text, 'destroy_at_customer_request'::text, 'compounded'::text, 'date'::text, 'policy'::text, 'no_data'::text, 'manual'::text])));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_return_status_check" CHECK (return_status = ANY (ARRAY['returnable'::text, 'non_returnable'::text, 'tbd'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_scan_source_check" CHECK (scan_source = ANY (ARRAY['gs1_qr'::text, 'barcode_1d'::text, 'manual'::text, 'ai_parsed'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_verification_status_check" CHECK (verification_status IS NULL OR (verification_status = ANY (ARRAY['correct'::text, 'damaged'::text, 'missing'::text, 'wrong_item'::text])));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rti_expiration ON public.return_transaction_items USING btree (expiration_date);
CREATE INDEX IF NOT EXISTS idx_rti_gtin ON public.return_transaction_items USING btree (gtin);
CREATE INDEX IF NOT EXISTS idx_rti_lot ON public.return_transaction_items USING btree (lot_number);
CREATE INDEX IF NOT EXISTS idx_rti_ndc ON public.return_transaction_items USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_rti_ndc_10 ON public.return_transaction_items USING btree (ndc_10);
CREATE INDEX IF NOT EXISTS idx_rti_status ON public.return_transaction_items USING btree (return_status);
CREATE INDEX IF NOT EXISTS idx_rti_transaction ON public.return_transaction_items USING btree (transaction_id);

-- Row Level Security
ALTER TABLE public."return_transaction_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."return_transaction_items";
CREATE POLICY "Allow all access via service role"
    ON public."return_transaction_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."return_transaction_items";
CREATE POLICY "all policy"
    ON public."return_transaction_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_return_transaction_items" ON public."return_transaction_items";
CREATE POLICY "service_role_all_return_transaction_items"
    ON public."return_transaction_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

