-- ============================================================
-- Table   : public.shipment_groups
-- ============================================================

DROP TABLE IF EXISTS public."shipment_groups" CASCADE;

CREATE TABLE public."shipment_groups" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "destination" text NOT NULL,
    "outbound_tracking" text,
    "shipped_at" timestamptz,
    "box_count" integer DEFAULT 1,
    "total_memos" integer DEFAULT 0,
    "fedex_shipment_id" text,
    "fedex_labels" jsonb,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "shipment_groups_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sg_created_at ON public.shipment_groups USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_sg_destination ON public.shipment_groups USING btree (destination);
CREATE INDEX IF NOT EXISTS idx_sg_shipped_at ON public.shipment_groups USING btree (shipped_at);

-- Row Level Security
ALTER TABLE public."shipment_groups" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."shipment_groups";
CREATE POLICY "all policy"
    ON public."shipment_groups"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_shipment_groups" ON public."shipment_groups";
CREATE POLICY "service_role_all_shipment_groups"
    ON public."shipment_groups"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

