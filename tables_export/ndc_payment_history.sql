-- ============================================================
-- Table   : public.ndc_payment_history
-- ============================================================

DROP TABLE IF EXISTS public."ndc_payment_history" CASCADE;

CREATE TABLE public."ndc_payment_history" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(20) NOT NULL,
    "ndc_normalized" varchar(11) NOT NULL,
    "debit_memo_id" uuid,
    "ask_price" numeric NOT NULL,
    "received_price" numeric NOT NULL,
    "payment_ratio" numeric,
    "manufacturer" text,
    "product_name" text,
    "pharmacy_name" text,
    "ask_date" date,
    "receive_date" date,
    "payment_method" text,
    "is_partial" boolean DEFAULT false NOT NULL,
    "percentage_returned" numeric,
    "ai_extracted" boolean DEFAULT false NOT NULL,
    "ai_confidence" numeric,
    "source" text DEFAULT 'manual'::text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "ndc_payment_history_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ndc_payment_history"
    ADD CONSTRAINT "ndc_payment_history_debit_memo_id_fkey" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nph_created_at_desc ON public.ndc_payment_history USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nph_debit_memo ON public.ndc_payment_history USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_nph_manufacturer ON public.ndc_payment_history USING btree (manufacturer);
CREATE INDEX IF NOT EXISTS idx_nph_ndc_normalized ON public.ndc_payment_history USING btree (ndc_normalized);

-- Row Level Security
ALTER TABLE public."ndc_payment_history" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."ndc_payment_history";
CREATE POLICY "Allow all access via service role"
    ON public."ndc_payment_history"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

