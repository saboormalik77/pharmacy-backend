-- ============================================================
-- Table   : public.email_logs
-- ============================================================

DROP TABLE IF EXISTS public."email_logs" CASCADE;

CREATE TABLE public."email_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ra_request_id" uuid,
    "smtp_message_id" varchar(255),
    "email_type" varchar(50) DEFAULT 'ra-request'::character varying,
    "recipient_email" varchar(255) NOT NULL,
    "subject" text,
    "status" varchar(50) DEFAULT 'sent'::character varying,
    "sent_at" timestamptz DEFAULT now(),
    "delivered_at" timestamptz,
    "bounced_at" timestamptz,
    "error_message" text,
    "smtp_response" jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "email_logs_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_ra_request ON public.email_logs USING btree (ra_request_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs USING btree (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_smtp_message_id ON public.email_logs USING btree (smtp_message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs USING btree (status);

-- Policies
DROP POLICY IF EXISTS "service_role_all_email_logs" ON public."email_logs";
CREATE POLICY "service_role_all_email_logs"
    ON public."email_logs"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

