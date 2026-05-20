-- ============================================================
-- Table   : public.non_returnable_products
-- ============================================================

DROP TABLE IF EXISTS public."non_returnable_products" CASCADE;

CREATE TABLE public."non_returnable_products" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "manufacturer_policy_id" uuid NOT NULL,
    "ndc" varchar(13) NOT NULL,
    "product_name" text,
    "reason" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "non_returnable_products_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."non_returnable_products"
    ADD CONSTRAINT "non_returnable_products_manufacturer_policy_id_fkey" FOREIGN KEY (manufacturer_policy_id) REFERENCES manufacturer_policies(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nrp_ndc ON public.non_returnable_products USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_nrp_policy_id ON public.non_returnable_products USING btree (manufacturer_policy_id);

-- Row Level Security
ALTER TABLE public."non_returnable_products" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."non_returnable_products";
CREATE POLICY "all policy"
    ON public."non_returnable_products"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_non_returnable_products" ON public."non_returnable_products";
CREATE POLICY "service_role_all_non_returnable_products"
    ON public."non_returnable_products"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

