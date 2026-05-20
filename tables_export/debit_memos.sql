-- ============================================================
-- Table   : public.debit_memos
-- ============================================================

DROP TABLE IF EXISTS public."debit_memos" CASCADE;

CREATE TABLE public."debit_memos" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "batch_id" uuid NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "memo_number" varchar(30) NOT NULL,
    "destination" text,
    "labeler_id" varchar(10),
    "labeler_name" text,
    "total_items" integer DEFAULT 0 NOT NULL,
    "total_ask_value" numeric DEFAULT 0 NOT NULL,
    "total_received_value" numeric DEFAULT 0 NOT NULL,
    "ra_number" text,
    "ra_requested_at" timestamptz,
    "ra_received_at" timestamptz,
    "tickler_date" date,
    "baggie_manifest" text,
    "outbound_tracking" text,
    "shipped_at" timestamptz,
    "payment_status" text DEFAULT 'pending'::text NOT NULL,
    "amount_requested" numeric DEFAULT 0 NOT NULL,
    "amount_received" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "ra_status" text DEFAULT 'pending'::text NOT NULL,
    "payment_received_at" timestamptz,
    "payment_reference" text,
    "payment_notes" text,
    "credit_memo_url" text,
    "shipment_group_id" uuid,
    "pharmacy_payout_id" uuid,
    CONSTRAINT "debit_memos_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."debit_memos"
    ADD CONSTRAINT "debit_memos_payment_status_check" CHECK (payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'disputed'::text]));

ALTER TABLE public."debit_memos"
    ADD CONSTRAINT "debit_memos_ra_status_check" CHECK (ra_status = ANY (ARRAY['pending'::text, 'requested'::text, 'received'::text, 'shipped'::text, 'overdue'::text]));

ALTER TABLE public."debit_memos"
    ADD CONSTRAINT "debit_memos_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES return_batches(id) ON DELETE CASCADE;

ALTER TABLE public."debit_memos"
    ADD CONSTRAINT "debit_memos_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

ALTER TABLE public."debit_memos"
    ADD CONSTRAINT "debit_memos_pharmacy_payout_id_fkey" FOREIGN KEY (pharmacy_payout_id) REFERENCES pharmacy_payments(id);

ALTER TABLE public."debit_memos"
    ADD CONSTRAINT "debit_memos_shipment_group_id_fkey" FOREIGN KEY (shipment_group_id) REFERENCES shipment_groups(id) ON DELETE SET NULL;

ALTER TABLE public."debit_memos"
    ADD CONSTRAINT "debit_memos_memo_number_key" UNIQUE (memo_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS debit_memos_memo_number_key ON public.debit_memos USING btree (memo_number);
CREATE INDEX IF NOT EXISTS idx_dm_batch ON public.debit_memos USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_dm_destination ON public.debit_memos USING btree (destination);
CREATE INDEX IF NOT EXISTS idx_dm_memo_number ON public.debit_memos USING btree (memo_number);
CREATE INDEX IF NOT EXISTS idx_dm_payment ON public.debit_memos USING btree (payment_status);
CREATE INDEX IF NOT EXISTS idx_dm_payment_status ON public.debit_memos USING btree (payment_status);
CREATE INDEX IF NOT EXISTS idx_dm_pharmacy ON public.debit_memos USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_dm_ra_status ON public.debit_memos USING btree (ra_status);
CREATE INDEX IF NOT EXISTS idx_dm_shipment_group ON public.debit_memos USING btree (shipment_group_id);

-- Row Level Security
ALTER TABLE public."debit_memos" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."debit_memos";
CREATE POLICY "all policy"
    ON public."debit_memos"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_debit_memos" ON public."debit_memos";
CREATE POLICY "service_role_all_debit_memos"
    ON public."debit_memos"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

