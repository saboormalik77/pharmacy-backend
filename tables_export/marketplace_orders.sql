-- ============================================================
-- Table   : public.marketplace_orders
-- ============================================================

DROP TABLE IF EXISTS public."marketplace_orders" CASCADE;

CREATE TABLE public."marketplace_orders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_number" varchar(20) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(30) DEFAULT 'pending'::character varying NOT NULL,
    "subtotal" numeric NOT NULL,
    "tax_amount" numeric DEFAULT 0 NOT NULL,
    "tax_rate" numeric DEFAULT 0.08 NOT NULL,
    "shipping_amount" numeric DEFAULT 0 NOT NULL,
    "discount_amount" numeric DEFAULT 0 NOT NULL,
    "total_amount" numeric NOT NULL,
    "total_savings" numeric DEFAULT 0 NOT NULL,
    "stripe_checkout_session_id" varchar(255),
    "stripe_payment_intent_id" varchar(255),
    "stripe_customer_id" varchar(255),
    "stripe_payment_method_id" varchar(255),
    "stripe_payment_status" varchar(50),
    "stripe_receipt_url" text,
    "payment_method_type" varchar(50),
    "payment_method_last4" varchar(4),
    "payment_method_brand" varchar(50),
    "shipping_address" jsonb,
    "shipping_method" varchar(100),
    "tracking_number" varchar(255),
    "notes" text,
    "internal_notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "paid_at" timestamptz,
    "shipped_at" timestamptz,
    "delivered_at" timestamptz,
    "cancelled_at" timestamptz,
    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_discount_amount_check" CHECK (discount_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_shipping_amount_check" CHECK (shipping_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[]));

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_subtotal_check" CHECK (subtotal >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_tax_amount_check" CHECK (tax_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_total_amount_check" CHECK (total_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_total_savings_check" CHECK (total_savings >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_order_number_key" UNIQUE (order_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created ON public.marketplace_orders USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_pharmacy ON public.marketplace_orders USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON public.marketplace_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_payment ON public.marketplace_orders USING btree (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_session ON public.marketplace_orders USING btree (stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_orders_order_number_key ON public.marketplace_orders USING btree (order_number);

-- Row Level Security
ALTER TABLE public."marketplace_orders" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access marketplace_orders" ON public."marketplace_orders";
CREATE POLICY "Service role can access marketplace_orders"
    ON public."marketplace_orders"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."marketplace_orders";
CREATE POLICY "all policy"
    ON public."marketplace_orders"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

