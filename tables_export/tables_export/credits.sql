-- ============================================================
-- Table   : public.credits
-- ============================================================

DROP TABLE IF EXISTS public."credits" CASCADE;

CREATE TABLE public."credits" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "return_id" uuid,
    "return_item_id" uuid,
    "drug_name" varchar(500),
    "manufacturer" varchar(255),
    "expected_amount" numeric,
    "actual_amount" numeric,
    "variance" numeric,
    "expected_payment_date" date,
    "actual_payment_date" date,
    "status" varchar(50) DEFAULT 'expected'::character varying,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "credits_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."credits"
    ADD CONSTRAINT "credits_status_check" CHECK (status::text = ANY (ARRAY['expected'::character varying::text, 'received'::character varying::text, 'overdue'::character varying::text, 'disputed'::character varying::text]));

ALTER TABLE public."credits"
    ADD CONSTRAINT "credits_return_id_fkey" FOREIGN KEY (return_id) REFERENCES returns(id);

ALTER TABLE public."credits"
    ADD CONSTRAINT "credits_return_item_id_fkey" FOREIGN KEY (return_item_id) REFERENCES return_items(id);

