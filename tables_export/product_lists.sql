-- ============================================================
-- Table   : public.product_lists
-- ============================================================

DROP TABLE IF EXISTS public."product_lists" CASCADE;

CREATE TABLE public."product_lists" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "name" varchar(255) NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "product_lists_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."product_lists"
    ADD CONSTRAINT "product_lists_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

