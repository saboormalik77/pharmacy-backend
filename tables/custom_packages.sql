-- ============================================================
-- Table   : public.custom_packages
-- ============================================================

DROP TABLE IF EXISTS public."custom_packages" CASCADE;

CREATE TABLE public."custom_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_number" varchar(100) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "distributor_name" varchar(255) NOT NULL,
    "distributor_id" uuid,
    "total_items" integer DEFAULT 0,
    "total_estimated_value" numeric DEFAULT 0,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "status" boolean DEFAULT false NOT NULL,
    "delivery_date" timestamptz,
    "received_by" varchar(255),
    "delivery_condition" varchar(50),
    "delivery_notes" text,
    "tracking_number" varchar(100),
    "carrier" varchar(50),
    "fee_rate" numeric,
    "fee_amount" numeric,
    "net_estimated_value" numeric,
    "fee_duration" integer,
    CONSTRAINT "custom_packages_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_carrier_check" CHECK (carrier::text = ANY (ARRAY['UPS'::character varying, 'FedEx'::character varying, 'USPS'::character varying, 'DHL'::character varying, 'Other'::character varying]::text[]));

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_delivery_condition_check" CHECK (delivery_condition::text = ANY (ARRAY['good'::character varying, 'damaged'::character varying, 'partial'::character varying, 'missing_items'::character varying, 'other'::character varying]::text[]));

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_distributor_id_fkey" FOREIGN KEY (distributor_id) REFERENCES reverse_distributors(id);

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_package_number_key" UNIQUE (package_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS custom_packages_package_number_key ON public.custom_packages USING btree (package_number);
CREATE INDEX IF NOT EXISTS idx_custom_packages_carrier ON public.custom_packages USING btree (carrier);
CREATE INDEX IF NOT EXISTS idx_custom_packages_delivery_date ON public.custom_packages USING btree (delivery_date);
CREATE INDEX IF NOT EXISTS idx_custom_packages_distributor_id ON public.custom_packages USING btree (distributor_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_package_number ON public.custom_packages USING btree (package_number);
CREATE INDEX IF NOT EXISTS idx_custom_packages_pharmacy_id ON public.custom_packages USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_status ON public.custom_packages USING btree (status);
CREATE INDEX IF NOT EXISTS idx_custom_packages_tracking_number ON public.custom_packages USING btree (tracking_number);

-- Policies
DROP POLICY IF EXISTS "service_role_all_custom_packages" ON public."custom_packages";
CREATE POLICY "service_role_all_custom_packages"
    ON public."custom_packages"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

