-- ============================================================
-- Table   : public.shipments
-- ============================================================

DROP TABLE IF EXISTS public."shipments" CASCADE;

CREATE TABLE public."shipments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "return_id" uuid,
    "tracking_number" varchar(100),
    "carrier" varchar(50),
    "service_level" varchar(100),
    "status" varchar(50) DEFAULT 'label_created'::character varying,
    "estimated_delivery" timestamptz,
    "actual_delivery" timestamptz,
    "events" jsonb[],
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "shipments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_carrier_check" CHECK (carrier::text = ANY (ARRAY['UPS'::character varying::text, 'FedEx'::character varying::text, 'USPS'::character varying::text]));

ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_status_check" CHECK (status::text = ANY (ARRAY['label_created'::character varying::text, 'picked_up'::character varying::text, 'in_transit'::character varying::text, 'delivered'::character varying::text, 'exception'::character varying::text]));

ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_return_id_fkey" FOREIGN KEY (return_id) REFERENCES returns(id);

ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_tracking_number_key" UNIQUE (tracking_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS shipments_tracking_number_key ON public.shipments USING btree (tracking_number);

