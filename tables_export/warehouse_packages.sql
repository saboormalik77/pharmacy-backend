-- ============================================================
-- Table   : public.warehouse_packages
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_packages" CASCADE;

CREATE TABLE public."warehouse_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_number" varchar(100) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(50) DEFAULT 'draft'::character varying,
    "total_items" integer DEFAULT 0,
    "total_estimated_value" numeric DEFAULT 0,
    "shipment_id" uuid,
    "tracking_number" varchar(100),
    "carrier" varchar(50),
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_packages_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_carrier_check" CHECK (carrier::text = ANY (ARRAY['UPS'::character varying::text, 'FedEx'::character varying::text, 'USPS'::character varying::text]));

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_status_check" CHECK (status::text = ANY (ARRAY['draft'::character varying::text, 'ready_to_ship'::character varying::text, 'in_transit'::character varying::text, 'received'::character varying::text, 'inspected'::character varying::text, 'processed'::character varying::text, 'completed'::character varying::text]));

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES shipments(id);

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_package_number_key" UNIQUE (package_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_packages_package_number_key ON public.warehouse_packages USING btree (package_number);

