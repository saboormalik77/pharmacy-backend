-- ============================================================
-- Table   : public.returns
-- ============================================================

DROP TABLE IF EXISTS public."returns" CASCADE;

CREATE TABLE public."returns" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(50) DEFAULT 'draft'::character varying,
    "total_estimated_credit" numeric DEFAULT 0,
    "shipment_id" uuid,
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "returns_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."returns"
    ADD CONSTRAINT "returns_status_check" CHECK (status::text = ANY (ARRAY['draft'::character varying::text, 'ready_to_ship'::character varying::text, 'in_transit'::character varying::text, 'processing'::character varying::text, 'completed'::character varying::text, 'cancelled'::character varying::text]));

ALTER TABLE public."returns"
    ADD CONSTRAINT "returns_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

