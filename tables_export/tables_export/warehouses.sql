-- ============================================================
-- Table   : public.warehouses
-- ============================================================

DROP TABLE IF EXISTS public."warehouses" CASCADE;

CREATE TABLE public."warehouses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "contact_name" varchar(255),
    "phone" varchar(50),
    "street" text,
    "city" varchar(100),
    "state" varchar(10),
    "zip" varchar(20),
    "country" varchar(10) DEFAULT 'US'::character varying,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "created_by" uuid,
    "updated_by" uuid,
    CONSTRAINT "warehouses_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouses"
    ADD CONSTRAINT "warehouses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."warehouses"
    ADD CONSTRAINT "warehouses_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES admin(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON public.warehouses USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_created_at ON public.warehouses USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_unique_default ON public.warehouses USING btree (is_default) WHERE (is_default = true);

-- Row Level Security
ALTER TABLE public."warehouses" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "MainAdmin can access warehouses" ON public."warehouses";
CREATE POLICY "MainAdmin can access warehouses"
    ON public."warehouses"
    AS PERMISSIVE
    FOR ALL TO 16481
    USING ((EXISTS ( SELECT 1
   FROM admin
  WHERE admin.id = auth.uid() AND (admin.role::text = 'main_admin'::text OR admin.email::text ~~ '%@pharmadmin.com'::text))));

DROP POLICY IF EXISTS "Service role can access warehouses" ON public."warehouses";
CREATE POLICY "Service role can access warehouses"
    ON public."warehouses"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."warehouses";
CREATE POLICY "all policy"
    ON public."warehouses"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

