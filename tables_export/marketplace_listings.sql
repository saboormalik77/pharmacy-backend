-- ============================================================
-- Table   : public.marketplace_listings
-- ============================================================

DROP TABLE IF EXISTS public."marketplace_listings" CASCADE;

CREATE TABLE public."marketplace_listings" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "seller_id" uuid NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "drug_name" varchar(500) NOT NULL,
    "strength" varchar(100),
    "manufacturer" varchar(255),
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "price_per_unit" numeric NOT NULL,
    "wac_price" numeric,
    "condition" varchar(100),
    "photos" text[],
    "status" varchar(50) DEFAULT 'pending_approval'::character varying,
    "location" jsonb,
    "visibility" varchar(20) DEFAULT 'public'::character varying,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."marketplace_listings"
    ADD CONSTRAINT "marketplace_listings_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'sold'::character varying::text, 'expired'::character varying::text, 'pending_approval'::character varying::text]));

ALTER TABLE public."marketplace_listings"
    ADD CONSTRAINT "marketplace_listings_visibility_check" CHECK (visibility::text = ANY (ARRAY['public'::character varying::text, 'private'::character varying::text]));

ALTER TABLE public."marketplace_listings"
    ADD CONSTRAINT "marketplace_listings_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

