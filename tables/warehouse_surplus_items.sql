-- ============================================================
-- Table   : public.warehouse_surplus_items
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_surplus_items" CASCADE;

CREATE TABLE public."warehouse_surplus_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "transaction_id" uuid NOT NULL,
    "ndc" varchar(13),
    "product_name" text,
    "manufacturer" text,
    "lot_number" text,
    "expiration_date" date,
    "quantity" integer DEFAULT 1 NOT NULL,
    "warehouse_location" text NOT NULL,
    "condition" text DEFAULT 'good'::text,
    "notes" text,
    "status" text DEFAULT 'stored'::text NOT NULL,
    "assigned_return_id" uuid,
    "reported_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "warehouse_surplus_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_condition_check" CHECK (condition = ANY (ARRAY['good'::text, 'damaged'::text, 'unknown'::text]));

ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_status_check" CHECK (status = ANY (ARRAY['stored'::text, 'assigned_to_return'::text, 'disposed'::text, 'other'::text]));

ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_assigned_return_id_fkey" FOREIGN KEY (assigned_return_id) REFERENCES return_transactions(id) ON DELETE SET NULL;

ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_surplus_items_transaction_id ON public.warehouse_surplus_items USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS idx_wsi_status ON public.warehouse_surplus_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_wsi_transaction ON public.warehouse_surplus_items USING btree (transaction_id);

-- Row Level Security
ALTER TABLE public."warehouse_surplus_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."warehouse_surplus_items";
CREATE POLICY "all policy"
    ON public."warehouse_surplus_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_warehouse_surplus_items" ON public."warehouse_surplus_items";
CREATE POLICY "service_role_all_warehouse_surplus_items"
    ON public."warehouse_surplus_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

