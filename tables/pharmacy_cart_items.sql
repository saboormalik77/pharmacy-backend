-- ============================================================
-- Table   : public.pharmacy_cart_items
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_cart_items" CASCADE;

CREATE TABLE public."pharmacy_cart_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "cart_id" uuid NOT NULL,
    "deal_id" uuid NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric NOT NULL,
    "original_price" numeric NOT NULL,
    "added_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_cart_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_original_price_check" CHECK (original_price > 0::numeric);

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_quantity_check" CHECK (quantity > 0);

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_unit_price_check" CHECK (unit_price > 0::numeric);

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_cart_id_fkey" FOREIGN KEY (cart_id) REFERENCES pharmacy_cart(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES marketplace_deals(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "unique_cart_deal" UNIQUE (cart_id, deal_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.pharmacy_cart_items USING btree (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_deal ON public.pharmacy_cart_items USING btree (deal_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_cart_deal ON public.pharmacy_cart_items USING btree (cart_id, deal_id);

-- Row Level Security
ALTER TABLE public."pharmacy_cart_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access pharmacy_cart_items" ON public."pharmacy_cart_items";
CREATE POLICY "Service role can access pharmacy_cart_items"
    ON public."pharmacy_cart_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_cart_items";
CREATE POLICY "all policy"
    ON public."pharmacy_cart_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

