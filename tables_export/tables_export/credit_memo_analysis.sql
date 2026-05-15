-- ============================================================
-- Table   : public.credit_memo_analysis
-- ============================================================

DROP TABLE IF EXISTS public."credit_memo_analysis" CASCADE;

CREATE TABLE public."credit_memo_analysis" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "debit_memo_id" uuid,
    "credit_memo_url" text,
    "ai_status" text DEFAULT 'completed'::text NOT NULL,
    "ai_confidence" numeric,
    "ai_extracted_total" numeric,
    "ai_extracted_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "ai_error_message" text,
    "human_reviewed" boolean DEFAULT false NOT NULL,
    "human_approved" boolean,
    "reviewed_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "credit_memo_analysis_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."credit_memo_analysis"
    ADD CONSTRAINT "credit_memo_analysis_ai_status_check" CHECK (ai_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'manual_review'::text]));

ALTER TABLE public."credit_memo_analysis"
    ADD CONSTRAINT "credit_memo_analysis_debit_memo_id_fkey" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cma_created_at ON public.credit_memo_analysis USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cma_debit_memo ON public.credit_memo_analysis USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_cma_status ON public.credit_memo_analysis USING btree (ai_status);

-- Row Level Security
ALTER TABLE public."credit_memo_analysis" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."credit_memo_analysis";
CREATE POLICY "Allow all access via service role"
    ON public."credit_memo_analysis"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

