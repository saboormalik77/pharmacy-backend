-- ============================================================
-- Table   : public.pricing_data
-- ============================================================

DROP TABLE IF EXISTS public."pricing_data" CASCADE;

CREATE TABLE public."pricing_data" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "reverse_distributor_id" uuid,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500),
    "manufacturer" varchar(255),
    "lot_number" varchar(100),
    "expiration_date" date,
    "quantity" integer,
    "credit_amount" numeric,
    "price_per_unit" numeric,
    "document_id" uuid,
    "payment_date" date,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "pricing_data_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pricing_data"
    ADD CONSTRAINT "pricing_data_document_id_fkey" FOREIGN KEY (document_id) REFERENCES uploaded_documents(id);

ALTER TABLE public."pricing_data"
    ADD CONSTRAINT "pricing_data_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pricing_data"
    ADD CONSTRAINT "pricing_data_reverse_distributor_id_fkey" FOREIGN KEY (reverse_distributor_id) REFERENCES reverse_distributors(id);

