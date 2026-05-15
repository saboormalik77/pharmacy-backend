-- ============================================================
-- Table   : public.processor_notifications
-- ============================================================

DROP TABLE IF EXISTS public."processor_notifications" CASCADE;

CREATE TABLE public."processor_notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "processor_id" uuid NOT NULL,
    "type" text NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "entity_type" text,
    "entity_id" uuid,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "processor_notifications_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processor_notifications"
    ADD CONSTRAINT "processor_notifications_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proc_notif_created_at ON public.processor_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proc_notif_entity ON public.processor_notifications USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_proc_notif_processor_id ON public.processor_notifications USING btree (processor_id);
CREATE INDEX IF NOT EXISTS idx_proc_notif_unread ON public.processor_notifications USING btree (processor_id, is_read) WHERE (is_read = false);

-- Row Level Security
ALTER TABLE public."processor_notifications" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."processor_notifications";
CREATE POLICY "all policy"
    ON public."processor_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "processor_notifications_service_role_all" ON public."processor_notifications";
CREATE POLICY "processor_notifications_service_role_all"
    ON public."processor_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

