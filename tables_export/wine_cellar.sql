-- ============================================================
-- Table   : public.wine_cellar
-- ============================================================

DROP TABLE IF EXISTS public."wine_cellar" CASCADE;

CREATE TABLE public."wine_cellar" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "transaction_item_id" uuid,
    "ndc" varchar(13),
    "ndc_10" varchar(12),
    "product_name" text,
    "manufacturer" text,
    "lot_number" text,
    "serial_number" text,
    "expiration_date" date,
    "quantity" integer DEFAULT 1 NOT NULL,
    "standard_price" numeric,
    "estimated_value" numeric,
    "is_partial" boolean DEFAULT false,
    "partial_percentage" numeric,
    "date_shelved" timestamptz DEFAULT now() NOT NULL,
    "expected_returnable_date" date,
    "physical_location" text,
    "baggie_barcode" text,
    "status" text DEFAULT 'shelved'::text NOT NULL,
    "returned_in_transaction_id" uuid,
    "returned_at" timestamptz,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "wine_cellar_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_status_check" CHECK (status = ANY (ARRAY['shelved'::text, 'ready_to_return'::text, 'returned'::text, 'destroyed'::text]));

ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_returned_in_transaction_id_fkey" FOREIGN KEY (returned_in_transaction_id) REFERENCES return_transactions(id) ON DELETE SET NULL;

ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_transaction_item_id_fkey" FOREIGN KEY (transaction_item_id) REFERENCES return_transaction_items(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wc_created_at ON public.wine_cellar USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wc_expected_date ON public.wine_cellar USING btree (expected_returnable_date);
CREATE INDEX IF NOT EXISTS idx_wc_expiration ON public.wine_cellar USING btree (expiration_date);
CREATE INDEX IF NOT EXISTS idx_wc_ndc ON public.wine_cellar USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_wc_pharmacy ON public.wine_cellar USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_wc_status ON public.wine_cellar USING btree (status);
CREATE INDEX IF NOT EXISTS idx_wc_transaction_item ON public.wine_cellar USING btree (transaction_item_id);

-- Row Level Security
ALTER TABLE public."wine_cellar" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."wine_cellar";
CREATE POLICY "Allow all access via service role"
    ON public."wine_cellar"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

