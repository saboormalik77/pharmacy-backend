-- ============================================================
-- Table   : public.return_batches
-- ============================================================

DROP TABLE IF EXISTS public."return_batches" CASCADE;

CREATE TABLE public."return_batches" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "batch_month" date NOT NULL,
    "batch_name" text NOT NULL,
    "status" text DEFAULT 'open'::text NOT NULL,
    "total_returns" integer DEFAULT 0 NOT NULL,
    "total_debit_memos" integer DEFAULT 0 NOT NULL,
    "total_value" numeric DEFAULT 0 NOT NULL,
    "cardinal_file_generated" boolean DEFAULT false NOT NULL,
    "cardinal_file_url" text,
    "cardinal_submitted_at" timestamptz,
    "cardinal_approved_at" timestamptz,
    "closed_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "return_batches_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_batches"
    ADD CONSTRAINT "return_batches_status_check" CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'submitted'::text]));

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_rb_batch_month ON public.return_batches USING btree (batch_month);
CREATE INDEX IF NOT EXISTS idx_rb_status ON public.return_batches USING btree (status);

-- Row Level Security
ALTER TABLE public."return_batches" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."return_batches";
CREATE POLICY "all policy"
    ON public."return_batches"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_return_batches" ON public."return_batches";
CREATE POLICY "service_role_all_return_batches"
    ON public."return_batches"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

