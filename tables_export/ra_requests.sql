-- ============================================================
-- Table   : public.ra_requests
-- ============================================================

DROP TABLE IF EXISTS public."ra_requests" CASCADE;

CREATE TABLE public."ra_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "debit_memo_id" uuid NOT NULL,
    "request_type" text DEFAULT 'initial'::text NOT NULL,
    "destination_email" text,
    "destination_name" text,
    "subject" text,
    "body_preview" text,
    "status" text DEFAULT 'sent'::text NOT NULL,
    "sent_by" text,
    "sent_at" timestamptz DEFAULT now() NOT NULL,
    "error_message" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "smtp_message_id" varchar(255),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ra_requests_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ra_requests"
    ADD CONSTRAINT "ra_requests_request_type_check" CHECK (request_type = ANY (ARRAY['initial'::text, 'reminder'::text, 'resend'::text]));

ALTER TABLE public."ra_requests"
    ADD CONSTRAINT "ra_requests_status_check" CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text, 'bounced'::text]));

ALTER TABLE public."ra_requests"
    ADD CONSTRAINT "ra_requests_debit_memo_id_fkey" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ra_requests_smtp_message_id ON public.ra_requests USING btree (smtp_message_id);
CREATE INDEX IF NOT EXISTS idx_rar_debit_memo ON public.ra_requests USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_rar_sent_at ON public.ra_requests USING btree (sent_at);
CREATE INDEX IF NOT EXISTS idx_rar_status ON public.ra_requests USING btree (status);

-- Row Level Security
ALTER TABLE public."ra_requests" ENABLE ROW LEVEL SECURITY;

