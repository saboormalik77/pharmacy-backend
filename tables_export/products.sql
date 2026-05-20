-- ============================================================
-- Table   : public.products
-- ============================================================

DROP TABLE IF EXISTS public."products" CASCADE;

CREATE TABLE public."products" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "manufacturer" varchar(255),
    "strength" varchar(100),
    "dosage_form" varchar(100),
    "package_size" integer,
    "wac" numeric,
    "awp" numeric,
    "dea_schedule" varchar(10),
    "return_eligibility" jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "products_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."products"
    ADD CONSTRAINT "products_ndc_key" UNIQUE (ndc);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_ndc ON public.products USING btree (ndc);
CREATE UNIQUE INDEX IF NOT EXISTS products_ndc_key ON public.products USING btree (ndc);

-- Policies
DROP POLICY IF EXISTS "service_role_all_products" ON public."products";
CREATE POLICY "service_role_all_products"
    ON public."products"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

