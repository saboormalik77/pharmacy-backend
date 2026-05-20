-- ============================================================
-- Table   : public.ndc_packages
-- ============================================================

DROP TABLE IF EXISTS public."ndc_packages" CASCADE;

CREATE TABLE public."ndc_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "product_ndc" varchar(20) NOT NULL,
    "ndc_package_code" varchar(20) NOT NULL,
    "package_description" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ndc_packages_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_packages_ndc_package_code ON public.ndc_packages USING btree (ndc_package_code);
CREATE INDEX IF NOT EXISTS idx_ndc_packages_product_ndc ON public.ndc_packages USING btree (product_ndc);

-- Policies
DROP POLICY IF EXISTS "service_role_all_ndc_packages" ON public."ndc_packages";
CREATE POLICY "service_role_all_ndc_packages"
    ON public."ndc_packages"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

