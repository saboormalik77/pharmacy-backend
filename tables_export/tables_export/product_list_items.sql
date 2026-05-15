-- ============================================================
-- Table   : public.product_list_items
-- ============================================================

DROP TABLE IF EXISTS public."product_list_items" CASCADE;

CREATE TABLE public."product_list_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500),
    "lot_number" varchar(100),
    "expiration_date" date,
    "notes" text,
    "added_at" timestamptz DEFAULT now(),
    "added_by" uuid,
    "full_units" integer NOT NULL,
    "partial_units" integer NOT NULL,
    CONSTRAINT "product_list_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_full_units_check" CHECK (full_units >= 0);

ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_partial_units_check" CHECK (partial_units >= 0);

ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_units_check" CHECK (full_units = 0 AND partial_units > 0 OR full_units > 0 AND partial_units = 0);

ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id);

-- Policies
DROP POLICY IF EXISTS "service_role_all_product_list_items" ON public."product_list_items";
CREATE POLICY "service_role_all_product_list_items"
    ON public."product_list_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

