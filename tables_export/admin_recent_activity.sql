-- ============================================================
-- Table   : public.admin_recent_activity
-- ============================================================

DROP TABLE IF EXISTS public."admin_recent_activity" CASCADE;

CREATE TABLE public."admin_recent_activity" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "activity_type" varchar(50) NOT NULL,
    "entity_id" uuid NOT NULL,
    "entity_name" varchar(500),
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "is_read" boolean DEFAULT false,
    "read_at" timestamptz,
    CONSTRAINT "admin_recent_activity_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."admin_recent_activity"
    ADD CONSTRAINT "admin_recent_activity_activity_type_check" CHECK (activity_type::text = ANY (ARRAY['document_uploaded'::character varying::text, 'product_added'::character varying::text, 'pharmacy_registered'::character varying::text]));

ALTER TABLE public."admin_recent_activity"
    ADD CONSTRAINT "admin_recent_activity_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_activity_type ON public.admin_recent_activity USING btree (activity_type);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_created_at ON public.admin_recent_activity USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_entity_id ON public.admin_recent_activity USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_is_read ON public.admin_recent_activity USING btree (is_read);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_pharmacy_id ON public.admin_recent_activity USING btree (pharmacy_id);

-- Row Level Security
ALTER TABLE public."admin_recent_activity" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "admin_recent_activity_insert_policy" ON public."admin_recent_activity";
CREATE POLICY "admin_recent_activity_insert_policy"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR INSERT TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "admin_recent_activity_select_policy" ON public."admin_recent_activity";
CREATE POLICY "admin_recent_activity_select_policy"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "all policy" ON public."admin_recent_activity";
CREATE POLICY "all policy"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_admin_recent_activity" ON public."admin_recent_activity";
CREATE POLICY "service_role_all_admin_recent_activity"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

