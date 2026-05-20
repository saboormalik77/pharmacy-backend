-- ============================================================
-- Table   : public.pharmacy_inventory_uploads
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_inventory_uploads" CASCADE;

CREATE TABLE public."pharmacy_inventory_uploads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "file_name" varchar(500) NOT NULL,
    "file_type" varchar(50) NOT NULL,
    "file_size" bigint NOT NULL,
    "total_items" integer DEFAULT 0,
    "total_value" numeric DEFAULT 0,
    "items_to_return" integer DEFAULT 0,
    "items_to_keep" integer DEFAULT 0,
    "status" varchar(50) DEFAULT 'processing'::character varying,
    "error_message" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_inventory_uploads_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_inventory_uploads"
    ADD CONSTRAINT "pharmacy_inventory_uploads_file_type_check" CHECK (file_type::text = ANY (ARRAY['csv'::character varying, 'pdf'::character varying, 'txt'::character varying, 'xlsx'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_uploads"
    ADD CONSTRAINT "pharmacy_inventory_uploads_status_check" CHECK (status::text = ANY (ARRAY['processing'::character varying, 'completed'::character varying, 'failed'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_uploads"
    ADD CONSTRAINT "pharmacy_inventory_uploads_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_created_at ON public.pharmacy_inventory_uploads USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_pharmacy_id ON public.pharmacy_inventory_uploads USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_status ON public.pharmacy_inventory_uploads USING btree (status);

-- Row Level Security
ALTER TABLE public."pharmacy_inventory_uploads" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Pharmacies can view own inventory uploads" ON public."pharmacy_inventory_uploads";
CREATE POLICY "Pharmacies can view own inventory uploads"
    ON public."pharmacy_inventory_uploads"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to inventory uploads" ON public."pharmacy_inventory_uploads";
CREATE POLICY "Service role full access to inventory uploads"
    ON public."pharmacy_inventory_uploads"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_inventory_uploads";
CREATE POLICY "all policy"
    ON public."pharmacy_inventory_uploads"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

