-- ============================================================
-- Table   : public.pharmacy_notifications
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_notifications" CASCADE;

CREATE TABLE public."pharmacy_notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "ndc_code" varchar(20),
    "product_name" varchar(500),
    "expiration_date" date,
    "days_until_expiration" integer,
    "full_units" integer DEFAULT 0,
    "partial_units" integer DEFAULT 0,
    "full_price" numeric DEFAULT 0,
    "partial_price" numeric DEFAULT 0,
    "total_potential_value" numeric DEFAULT 0,
    "recommended_distributor_id" uuid,
    "recommended_distributor_name" varchar(500),
    "status" varchar(20) DEFAULT 'unread'::character varying,
    "read_at" timestamptz,
    "dismissed_at" timestamptz,
    "inventory_item_id" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "entity_id" uuid,
    "entity_type" text,
    "is_read" boolean DEFAULT false NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "type" text DEFAULT 'general'::text NOT NULL,
    CONSTRAINT "pharmacy_notifications_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_status_check" CHECK (status::text = ANY (ARRAY['unread'::character varying, 'read'::character varying, 'dismissed'::character varying, 'acted_on'::character varying]::text[]));

ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_inventory_item_id_fkey" FOREIGN KEY (inventory_item_id) REFERENCES pharmacy_inventory_items(id) ON DELETE SET NULL;

ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_recommended_distributor_id_fkey" FOREIGN KEY (recommended_distributor_id) REFERENCES reverse_distributors(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharm_notif_created_at ON public.pharmacy_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_entity ON public.pharmacy_notifications USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_pharmacy_id ON public.pharmacy_notifications USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_unread ON public.pharmacy_notifications USING btree (pharmacy_id, is_read) WHERE (is_read = false);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_created_at ON public.pharmacy_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_ndc ON public.pharmacy_notifications USING btree (ndc_code);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_pharmacy_id ON public.pharmacy_notifications USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_status ON public.pharmacy_notifications USING btree (status);

-- Row Level Security
ALTER TABLE public."pharmacy_notifications" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."pharmacy_notifications";
CREATE POLICY "all policy"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "pharmacy_notifications_select_policy" ON public."pharmacy_notifications";
CREATE POLICY "pharmacy_notifications_select_policy"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "pharmacy_notifications_service_policy" ON public."pharmacy_notifications";
CREATE POLICY "pharmacy_notifications_service_policy"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "pharmacy_notifications_service_role_all" ON public."pharmacy_notifications";
CREATE POLICY "pharmacy_notifications_service_role_all"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

