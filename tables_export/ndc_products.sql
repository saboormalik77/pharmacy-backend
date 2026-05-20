-- ============================================================
-- Table   : public.ndc_products
-- ============================================================

DROP TABLE IF EXISTS public."ndc_products" CASCADE;

CREATE TABLE public."ndc_products" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "product_ndc" varchar(20) NOT NULL,
    "product_type_name" varchar(100),
    "proprietary_name" varchar(255),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ndc_products_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_products_product_ndc ON public.ndc_products USING btree (product_ndc);
CREATE INDEX IF NOT EXISTS idx_ndc_products_proprietary_name ON public.ndc_products USING btree (proprietary_name);

-- Policies
DROP POLICY IF EXISTS "service_role_all_ndc_products" ON public."ndc_products";
CREATE POLICY "service_role_all_ndc_products"
    ON public."ndc_products"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

