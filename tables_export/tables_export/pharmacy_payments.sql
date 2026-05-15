-- ============================================================
-- Table   : public.pharmacy_payments
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_payments" CASCADE;

CREATE TABLE public."pharmacy_payments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "batch_id" uuid,
    "total_credit_received" numeric DEFAULT 0 NOT NULL,
    "company_fee" numeric DEFAULT 0 NOT NULL,
    "company_fee_percent" numeric DEFAULT 0 NOT NULL,
    "gpo_share" numeric DEFAULT 0 NOT NULL,
    "gpo_name" text,
    "pharmacy_payout" numeric DEFAULT 0 NOT NULL,
    "payment_method" text,
    "payment_reference" text,
    "paid_at" timestamptz,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "check_date" timestamptz,
    "check_number" text,
    "direct_credit_amount" numeric DEFAULT 0,
    "gross_credit_amount" numeric DEFAULT 0,
    "included_credit_amount" numeric DEFAULT 0,
    "is_legacy" boolean DEFAULT false,
    "payment_type" text DEFAULT 'ocs'::text,
    "pharmacy_account_number" text,
    "por_credit_amount" numeric DEFAULT 0,
    "return_reference_number" text,
    "rsi_fee_direct_percent" numeric DEFAULT 14.90,
    "rsi_fee_included_percent" numeric DEFAULT 14.90,
    "service_date" timestamptz,
    CONSTRAINT "pharmacy_payments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_payments"
    ADD CONSTRAINT "pharmacy_payments_payment_method_check" CHECK (payment_method = ANY (ARRAY['wire'::text, 'check'::text, 'zelle'::text, 'cash'::text]));

ALTER TABLE public."pharmacy_payments"
    ADD CONSTRAINT "pharmacy_payments_payment_type_check" CHECK (payment_type = ANY (ARRAY['ocs'::text, 'por'::text, 'direct'::text]));

ALTER TABLE public."pharmacy_payments"
    ADD CONSTRAINT "pharmacy_payments_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'failed'::text, 'disputed'::text]));

ALTER TABLE public."pharmacy_payments"
    ADD CONSTRAINT "pharmacy_payments_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES return_batches(id) ON DELETE SET NULL;

ALTER TABLE public."pharmacy_payments"
    ADD CONSTRAINT "pharmacy_payments_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_batch_id ON public.pharmacy_payments USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_created_at ON public.pharmacy_payments USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_pharmacy_id ON public.pharmacy_payments USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_payments_status ON public.pharmacy_payments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pp_batch ON public.pharmacy_payments USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_pp_check_date ON public.pharmacy_payments USING btree (check_date);
CREATE INDEX IF NOT EXISTS idx_pp_check_number ON public.pharmacy_payments USING btree (check_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_check_number_unique ON public.pharmacy_payments USING btree (check_number) WHERE (check_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pp_payment_type ON public.pharmacy_payments USING btree (payment_type);
CREATE INDEX IF NOT EXISTS idx_pp_pharmacy ON public.pharmacy_payments USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pp_return_ref ON public.pharmacy_payments USING btree (return_reference_number);
CREATE INDEX IF NOT EXISTS idx_pp_service_date ON public.pharmacy_payments USING btree (service_date);
CREATE INDEX IF NOT EXISTS idx_pp_status ON public.pharmacy_payments USING btree (status);

-- Row Level Security
ALTER TABLE public."pharmacy_payments" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."pharmacy_payments";
CREATE POLICY "all policy"
    ON public."pharmacy_payments"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_pharmacy_payments" ON public."pharmacy_payments";
CREATE POLICY "service_role_all_pharmacy_payments"
    ON public."pharmacy_payments"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

