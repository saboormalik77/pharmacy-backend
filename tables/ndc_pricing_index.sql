-- ============================================================
-- Table   : public.ndc_pricing_index
-- ============================================================

DROP TABLE IF EXISTS public."ndc_pricing_index" CASCADE;

CREATE TABLE public."ndc_pricing_index" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc_original" varchar(50) NOT NULL,
    "ndc_normalized" varchar(20) NOT NULL,
    "product_name" text,
    "distributor_id" uuid,
    "distributor_name" varchar(255) NOT NULL,
    "distributor_email" varchar(255),
    "distributor_phone" varchar(50),
    "distributor_location" text,
    "price_per_unit" numeric,
    "credit_amount" numeric,
    "quantity" integer,
    "is_full_record" boolean DEFAULT false NOT NULL,
    "is_partial_record" boolean DEFAULT false NOT NULL,
    "source_report_id" uuid,
    "report_date" date,
    "uploaded_at" timestamptz,
    "source_created_at" timestamptz,
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ndc_pricing_index_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ndc_pricing_index"
    ADD CONSTRAINT "ndc_pricing_index_source_report_id_fkey" FOREIGN KEY (source_report_id) REFERENCES return_reports(id) ON DELETE SET NULL;

ALTER TABLE public."ndc_pricing_index"
    ADD CONSTRAINT "ndc_pricing_index_ndc_normalized_distributor_name_is_full_r_key" UNIQUE (ndc_normalized, distributor_name, is_full_record, is_partial_record);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_distributor ON public.ndc_pricing_index USING btree (distributor_id);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_distributor_name ON public.ndc_pricing_index USING btree (distributor_name);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_dist_name ON public.ndc_pricing_index USING btree (ndc_normalized, distributor_name);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_normalized ON public.ndc_pricing_index USING btree (ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_orig_trgm ON public.ndc_pricing_index USING gin (ndc_original gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_original ON public.ndc_pricing_index USING btree (ndc_original);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_trgm ON public.ndc_pricing_index USING gin (ndc_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_product_trgm ON public.ndc_pricing_index USING gin (product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_report_date ON public.ndc_pricing_index USING btree (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_updated ON public.ndc_pricing_index USING btree (updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ndc_pricing_index_ndc_normalized_distributor_name_is_full_r_key ON public.ndc_pricing_index USING btree (ndc_normalized, distributor_name, is_full_record, is_partial_record);

-- Row Level Security
ALTER TABLE public."ndc_pricing_index" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."ndc_pricing_index";
CREATE POLICY "all policy"
    ON public."ndc_pricing_index"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ndc_pricing_index" ON public."ndc_pricing_index";
CREATE POLICY "service_role_all_ndc_pricing_index"
    ON public."ndc_pricing_index"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

