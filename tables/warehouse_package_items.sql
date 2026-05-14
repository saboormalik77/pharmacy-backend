-- ============================================================
-- Table   : public.warehouse_package_items
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_package_items" CASCADE;

CREATE TABLE public."warehouse_package_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_id" uuid NOT NULL,
    "inventory_item_id" uuid,
    "ndc" varchar(50) NOT NULL,
    "drug_name" varchar(500) NOT NULL,
    "manufacturer" varchar(255),
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "reason" varchar(100),
    "estimated_credit" numeric,
    "classification" varchar(50),
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_package_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_classification_check" CHECK (classification::text = ANY (ARRAY['returnable'::character varying::text, 'destruction'::character varying::text, 'pending'::character varying::text]));

ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_reason_check" CHECK (reason::text = ANY (ARRAY['expired'::character varying::text, 'expiring_soon'::character varying::text, 'damaged'::character varying::text, 'recalled'::character varying::text, 'other'::character varying::text]));

ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_inventory_item_id_fkey" FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_package_id_fkey" FOREIGN KEY (package_id) REFERENCES warehouse_packages(id) ON DELETE CASCADE;

