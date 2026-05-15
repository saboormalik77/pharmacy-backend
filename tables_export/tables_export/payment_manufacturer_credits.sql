-- ============================================================
-- Table   : public.payment_manufacturer_credits
-- ============================================================

DROP TABLE IF EXISTS public."payment_manufacturer_credits" CASCADE;

CREATE TABLE public."payment_manufacturer_credits" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "payment_id" uuid NOT NULL,
    "manufacturer_name" text NOT NULL,
    "credit_amount" numeric DEFAULT 0 NOT NULL,
    "credit_type" text NOT NULL,
    "is_controlled_substance" boolean DEFAULT false,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "payment_manufacturer_credits_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."payment_manufacturer_credits"
    ADD CONSTRAINT "payment_manufacturer_credits_credit_type_check" CHECK (credit_type = ANY (ARRAY['included'::text, 'direct'::text, 'por'::text]));

ALTER TABLE public."payment_manufacturer_credits"
    ADD CONSTRAINT "payment_manufacturer_credits_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES pharmacy_payments(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pmc_created_at ON public.payment_manufacturer_credits USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_pmc_credit_type ON public.payment_manufacturer_credits USING btree (credit_type);
CREATE INDEX IF NOT EXISTS idx_pmc_manufacturer ON public.payment_manufacturer_credits USING btree (manufacturer_name);
CREATE INDEX IF NOT EXISTS idx_pmc_payment_id ON public.payment_manufacturer_credits USING btree (payment_id);

-- Row Level Security
ALTER TABLE public."payment_manufacturer_credits" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."payment_manufacturer_credits";
CREATE POLICY "Allow all access via service role"
    ON public."payment_manufacturer_credits"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

