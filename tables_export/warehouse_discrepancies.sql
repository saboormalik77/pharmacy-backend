-- ============================================================
-- Table   : public.warehouse_discrepancies
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_discrepancies" CASCADE;

CREATE TABLE public."warehouse_discrepancies" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "transaction_id" uuid NOT NULL,
    "item_id" uuid,
    "type" text NOT NULL,
    "ndc" text,
    "product_name" text,
    "expected_quantity" integer,
    "actual_quantity" integer,
    "notes" text,
    "status" text DEFAULT 'open'::text,
    "resolved_by" uuid,
    "resolved_at" timestamptz,
    "resolution_notes" text,
    "reported_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "resolution" text,
    CONSTRAINT "warehouse_discrepancies_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_discrepancies_reported_by ON public.warehouse_discrepancies USING btree (reported_by);

-- Row Level Security
ALTER TABLE public."warehouse_discrepancies" ENABLE ROW LEVEL SECURITY;

