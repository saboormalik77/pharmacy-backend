-- ============================================================
-- Table   : public.pharmacy_cart
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_cart" CASCADE;

CREATE TABLE public."pharmacy_cart" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_cart_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_cart"
    ADD CONSTRAINT "pharmacy_cart_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_cart"
    ADD CONSTRAINT "unique_pharmacy_cart" UNIQUE (pharmacy_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_cart_pharmacy ON public.pharmacy_cart USING btree (pharmacy_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_pharmacy_cart ON public.pharmacy_cart USING btree (pharmacy_id);

-- Row Level Security
ALTER TABLE public."pharmacy_cart" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access pharmacy_cart" ON public."pharmacy_cart";
CREATE POLICY "Service role can access pharmacy_cart"
    ON public."pharmacy_cart"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_cart";
CREATE POLICY "all policy"
    ON public."pharmacy_cart"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

