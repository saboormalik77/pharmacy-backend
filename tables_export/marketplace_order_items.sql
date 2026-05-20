-- ============================================================
-- Table   : public.marketplace_order_items
-- ============================================================

DROP TABLE IF EXISTS public."marketplace_order_items" CASCADE;

CREATE TABLE public."marketplace_order_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_id" uuid NOT NULL,
    "deal_id" uuid NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "ndc" varchar(50),
    "category" varchar(100),
    "distributor" varchar(255),
    "quantity" integer NOT NULL,
    "unit_price" numeric NOT NULL,
    "original_price" numeric NOT NULL,
    "line_total" numeric NOT NULL,
    "line_savings" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "marketplace_order_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_line_savings_check" CHECK (line_savings >= 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_line_total_check" CHECK (line_total >= 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_original_price_check" CHECK (original_price > 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_quantity_check" CHECK (quantity > 0);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_unit_price_check" CHECK (unit_price > 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES marketplace_deals(id) ON DELETE RESTRICT;

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_deal ON public.marketplace_order_items USING btree (deal_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.marketplace_order_items USING btree (order_id);

-- Row Level Security
ALTER TABLE public."marketplace_order_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access marketplace_order_items" ON public."marketplace_order_items";
CREATE POLICY "Service role can access marketplace_order_items"
    ON public."marketplace_order_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."marketplace_order_items";
CREATE POLICY "all policy"
    ON public."marketplace_order_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

