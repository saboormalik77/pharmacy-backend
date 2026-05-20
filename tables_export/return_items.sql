-- ============================================================
-- Table   : public.return_items
-- ============================================================

DROP TABLE IF EXISTS public."return_items" CASCADE;

CREATE TABLE public."return_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "return_id" uuid NOT NULL,
    "inventory_item_id" uuid,
    "ndc" varchar(50) NOT NULL,
    "drug_name" varchar(500) NOT NULL,
    "manufacturer" varchar(255),
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "reason" text,
    "estimated_credit" numeric,
    "classification" varchar(50),
    "photos" text[],
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "return_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_items"
    ADD CONSTRAINT "return_items_classification_check" CHECK (classification::text = ANY (ARRAY['returnable'::character varying::text, 'destruction'::character varying::text, 'pending'::character varying::text]));

ALTER TABLE public."return_items"
    ADD CONSTRAINT "return_items_inventory_item_id_fkey" FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

ALTER TABLE public."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;

