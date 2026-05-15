-- ============================================================
-- Table   : public.orders
-- ============================================================

DROP TABLE IF EXISTS public."orders" CASCADE;

CREATE TABLE public."orders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "listing_id" uuid,
    "buyer_id" uuid NOT NULL,
    "seller_id" uuid NOT NULL,
    "drug_name" varchar(500),
    "quantity" integer NOT NULL,
    "total_amount" numeric NOT NULL,
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "tracking_number" varchar(100),
    "created_at" timestamptz DEFAULT now(),
    "confirmed_at" timestamptz,
    "shipped_at" timestamptz,
    "delivered_at" timestamptz,
    CONSTRAINT "orders_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'confirmed'::character varying::text, 'shipped'::character varying::text, 'delivered'::character varying::text, 'cancelled'::character varying::text]));

ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id);

ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

