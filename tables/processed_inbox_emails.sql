-- ============================================================
-- Table   : public.processed_inbox_emails
-- ============================================================

DROP TABLE IF EXISTS public."processed_inbox_emails" CASCADE;

CREATE TABLE public."processed_inbox_emails" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email_uid" text NOT NULL,
    "email_message_id" text,
    "from_address" text NOT NULL,
    "to_address" text,
    "subject" text,
    "received_at" timestamptz,
    "processed_at" timestamptz DEFAULT now() NOT NULL,
    "memo_number" text,
    "debit_memo_id" uuid,
    "extracted_ra_number" text,
    "ai_confidence" numeric DEFAULT 0,
    "ai_raw_response" jsonb DEFAULT '{}'::jsonb,
    "status" text DEFAULT 'processed'::text NOT NULL,
    "error_message" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "pdf_url" text,
    "ra_number" text,
    CONSTRAINT "processed_inbox_emails_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processed_inbox_emails"
    ADD CONSTRAINT "fk_processed_inbox_debit_memo" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processed_inbox_debit_memo ON public.processed_inbox_emails USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_email_uid ON public.processed_inbox_emails USING btree (email_uid);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_memo_number ON public.processed_inbox_emails USING btree (memo_number);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_processed ON public.processed_inbox_emails USING btree (processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_status ON public.processed_inbox_emails USING btree (status);

-- Policies
DROP POLICY IF EXISTS "Service role full access on processed_inbox_emails" ON public."processed_inbox_emails";
CREATE POLICY "Service role full access on processed_inbox_emails"
    ON public."processed_inbox_emails"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."processed_inbox_emails";
CREATE POLICY "all policy"
    ON public."processed_inbox_emails"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

