-- ============================================================
-- Table   : public.pharmacy_inventory_items
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_inventory_items" CASCADE;

CREATE TABLE public."pharmacy_inventory_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "upload_id" uuid NOT NULL,
    "ndc_code" varchar(20) NOT NULL,
    "ndc_normalized" varchar(20),
    "product_name" varchar(500),
    "manufacturer" varchar(500),
    "quantity" integer DEFAULT 1 NOT NULL,
    "full_units" integer DEFAULT 0,
    "partial_units" integer DEFAULT 0,
    "expiration_date" date,
    "lot_number" varchar(100),
    "acquisition_cost" numeric,
    "recommendation_type" varchar(20) DEFAULT 'pending'::character varying,
    "recommended_distributor_id" uuid,
    "recommended_distributor_name" varchar(500),
    "estimated_return_value" numeric DEFAULT 0,
    "best_full_price" numeric DEFAULT 0,
    "best_partial_price" numeric DEFAULT 0,
    "confidence_score" integer DEFAULT 0,
    "recommendation_reason" text,
    "status" varchar(20) DEFAULT 'active'::character varying,
    "returned_at" timestamptz,
    "returned_to_distributor_id" uuid,
    "actual_return_value" numeric,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_inventory_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_recommendation_type_check" CHECK (recommendation_type::text = ANY (ARRAY['return_now'::character varying, 'keep'::character varying, 'monitor'::character varying, 'pending'::character varying, 'no_data'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'returned'::character varying, 'expired'::character varying, 'dismissed'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_recommended_distributor_id_fkey" FOREIGN KEY (recommended_distributor_id) REFERENCES reverse_distributors(id);

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_returned_to_distributor_id_fkey" FOREIGN KEY (returned_to_distributor_id) REFERENCES reverse_distributors(id);

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_upload_id_fkey" FOREIGN KEY (upload_id) REFERENCES pharmacy_inventory_uploads(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_expiration_date ON public.pharmacy_inventory_items USING btree (expiration_date);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_ndc_normalized ON public.pharmacy_inventory_items USING btree (ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_pharmacy_id ON public.pharmacy_inventory_items USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_recommendation_type ON public.pharmacy_inventory_items USING btree (recommendation_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_status ON public.pharmacy_inventory_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_upload_id ON public.pharmacy_inventory_items USING btree (upload_id);

-- Row Level Security
ALTER TABLE public."pharmacy_inventory_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Pharmacies can view own inventory items" ON public."pharmacy_inventory_items";
CREATE POLICY "Pharmacies can view own inventory items"
    ON public."pharmacy_inventory_items"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to inventory items" ON public."pharmacy_inventory_items";
CREATE POLICY "Service role full access to inventory items"
    ON public."pharmacy_inventory_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_inventory_items";
CREATE POLICY "all policy"
    ON public."pharmacy_inventory_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

