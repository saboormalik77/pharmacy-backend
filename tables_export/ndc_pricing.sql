-- ============================================================
-- Table   : public.ndc_pricing
-- ============================================================

DROP TABLE IF EXISTS public."ndc_pricing" CASCADE;

CREATE TABLE public."ndc_pricing" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(20) NOT NULL,
    "ndc_normalized" varchar(11) NOT NULL,
    "product_name" text,
    "manufacturer" text,
    "current_price" numeric,
    "last_price" numeric,
    "estimated_store_price" numeric,
    "last_reimbursement" numeric,
    "price_source" text,
    "close_out_destination" text,
    "last_price_update" timestamptz,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "ai_confidence" numeric,
    "ask_received_ratio" numeric,
    "avg_ask_price" numeric,
    "avg_received_price" numeric,
    "last_5_payments" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "last_ask_received_update" timestamptz,
    "manufacturer_reliability" text,
    "max_received_price" numeric,
    "min_received_price" numeric,
    "payment_sample_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "ndc_pricing_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ndc_pricing"
    ADD CONSTRAINT "ndc_pricing_close_out_destination_check" CHECK (close_out_destination IS NULL OR (close_out_destination = ANY (ARRAY['inmar'::text, 'qualanex'::text, 'pharmalink'::text, 'other'::text])));

ALTER TABLE public."ndc_pricing"
    ADD CONSTRAINT "ndc_pricing_reliability_check" CHECK (manufacturer_reliability IS NULL OR (manufacturer_reliability = ANY (ARRAY['excellent'::text, 'good'::text, 'average'::text, 'poor'::text, 'unknown'::text])));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc ON public.ndc_pricing USING btree (ndc);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ndc_pricing_normalized ON public.ndc_pricing USING btree (ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_product_name ON public.ndc_pricing USING gin (to_tsvector('english'::regconfig, COALESCE(product_name, ''::text)));

-- Row Level Security
ALTER TABLE public."ndc_pricing" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."ndc_pricing";
CREATE POLICY "all policy"
    ON public."ndc_pricing"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ndc_pricing" ON public."ndc_pricing";
CREATE POLICY "service_role_all_ndc_pricing"
    ON public."ndc_pricing"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

