-- ============================================================
-- Table   : public.custom_package_items
-- ============================================================

DROP TABLE IF EXISTS public."custom_package_items" CASCADE;

CREATE TABLE public."custom_package_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_id" uuid NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "price_per_unit" numeric NOT NULL,
    "total_value" numeric NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "full" integer DEFAULT 0 NOT NULL,
    "partial" integer DEFAULT 0 NOT NULL,
    "quantity" integer NOT NULL,
    CONSTRAINT "custom_package_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."custom_package_items"
    ADD CONSTRAINT "custom_package_items_package_id_fkey" FOREIGN KEY (package_id) REFERENCES custom_packages(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_package_items_ndc ON public.custom_package_items USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_custom_package_items_package_id ON public.custom_package_items USING btree (package_id);

-- Policies
DROP POLICY IF EXISTS "service_role_all_custom_package_items" ON public."custom_package_items";
CREATE POLICY "service_role_all_custom_package_items"
    ON public."custom_package_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

