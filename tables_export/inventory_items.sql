-- ============================================================
-- Table   : public.inventory_items
-- ============================================================

DROP TABLE IF EXISTS public."inventory_items" CASCADE;

CREATE TABLE public."inventory_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "location" varchar(255),
    "boxes" integer,
    "tablets_per_box" integer,
    "status" varchar(50) DEFAULT 'active'::character varying,
    "days_until_expiration" integer,
    "added_date" timestamptz DEFAULT now(),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."inventory_items"
    ADD CONSTRAINT "inventory_items_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'expiring_soon'::character varying::text, 'expired'::character varying::text]));

ALTER TABLE public."inventory_items"
    ADD CONSTRAINT "inventory_items_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

