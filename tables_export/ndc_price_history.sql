-- ============================================================
-- Table   : public.ndc_price_history
-- ============================================================

DROP TABLE IF EXISTS public."ndc_price_history" CASCADE;

CREATE TABLE public."ndc_price_history" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(13) NOT NULL,
    "old_price" numeric,
    "new_price" numeric NOT NULL,
    "price_source" text,
    "changed_by" uuid,
    "changed_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "ndc_price_history_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nph_changed_at ON public.ndc_price_history USING btree (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nph_ndc ON public.ndc_price_history USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_nph_source ON public.ndc_price_history USING btree (price_source);

-- Row Level Security
ALTER TABLE public."ndc_price_history" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."ndc_price_history";
CREATE POLICY "all policy"
    ON public."ndc_price_history"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ndc_price_history" ON public."ndc_price_history";
CREATE POLICY "service_role_all_ndc_price_history"
    ON public."ndc_price_history"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

