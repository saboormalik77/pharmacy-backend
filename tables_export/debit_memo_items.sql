-- ============================================================
-- Table   : public.debit_memo_items
-- ============================================================

DROP TABLE IF EXISTS public."debit_memo_items" CASCADE;

CREATE TABLE public."debit_memo_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "debit_memo_id" uuid NOT NULL,
    "transaction_item_id" uuid,
    "ndc" varchar(13),
    "product_name" text,
    "quantity" integer DEFAULT 1 NOT NULL,
    "ask_price" numeric,
    "received_price" numeric,
    "lot_number" text,
    "expiration_date" date,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "is_non_returnable" boolean DEFAULT false NOT NULL,
    "non_returnable_reason" text,
    CONSTRAINT "debit_memo_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."debit_memo_items"
    ADD CONSTRAINT "debit_memo_items_debit_memo_id_fkey" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE CASCADE;

ALTER TABLE public."debit_memo_items"
    ADD CONSTRAINT "debit_memo_items_transaction_item_id_fkey" FOREIGN KEY (transaction_item_id) REFERENCES return_transaction_items(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dmi_is_non_returnable ON public.debit_memo_items USING btree (is_non_returnable);
CREATE INDEX IF NOT EXISTS idx_dmi_item ON public.debit_memo_items USING btree (transaction_item_id);
CREATE INDEX IF NOT EXISTS idx_dmi_memo ON public.debit_memo_items USING btree (debit_memo_id);

-- Row Level Security
ALTER TABLE public."debit_memo_items" ENABLE ROW LEVEL SECURITY;

