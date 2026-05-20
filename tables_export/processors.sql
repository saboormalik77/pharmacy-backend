-- ============================================================
-- Table   : public.processors
-- ============================================================

DROP TABLE IF EXISTS public."processors" CASCADE;

CREATE TABLE public."processors" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "email" text,
    "phone" text,
    "status" text DEFAULT 'active'::text NOT NULL,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "admin_user_id" uuid,
    "buying_group_id" uuid,
    CONSTRAINT "processors_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]));

ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_email_key" UNIQUE (email);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processors_admin_user_id ON public.processors USING btree (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_processors_buying_group_id ON public.processors USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_processors_email ON public.processors USING btree (email);
CREATE INDEX IF NOT EXISTS idx_processors_status ON public.processors USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS processors_email_key ON public.processors USING btree (email);

-- Row Level Security
ALTER TABLE public."processors" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."processors";
CREATE POLICY "all policy"
    ON public."processors"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_processors" ON public."processors";
CREATE POLICY "service_role_all_processors"
    ON public."processors"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

