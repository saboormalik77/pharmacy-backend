-- ============================================================
-- Table   : public.manufacturer_return_policies
-- ============================================================

DROP TABLE IF EXISTS public."manufacturer_return_policies" CASCADE;

CREATE TABLE public."manufacturer_return_policies" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "manufacturer_policy_id" uuid NOT NULL,
    "destination" text NOT NULL,
    "auto_ra_email" text,
    "policy_number" integer,
    "policy_description" text,
    "months_before_expiration" integer DEFAULT 6 NOT NULL,
    "months_after_expiration" integer DEFAULT 6 NOT NULL,
    "discount_rate" numeric,
    "partials_accepted" boolean DEFAULT false NOT NULL,
    "partial_dosage_forms" text[],
    "reimbursement_type" text DEFAULT 'batch'::text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "returnable_within_policy_period" boolean DEFAULT true NOT NULL,
    CONSTRAINT "manufacturer_return_policies_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."manufacturer_return_policies"
    ADD CONSTRAINT "manufacturer_return_policies_reimbursement_type_check" CHECK (reimbursement_type = ANY (ARRAY['batch'::text, 'per_item'::text, 'credit'::text, 'check'::text, 'ach'::text]));

ALTER TABLE public."manufacturer_return_policies"
    ADD CONSTRAINT "manufacturer_return_policies_manufacturer_policy_id_fkey" FOREIGN KEY (manufacturer_policy_id) REFERENCES manufacturer_policies(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mrp_policy_id ON public.manufacturer_return_policies USING btree (manufacturer_policy_id);

-- Row Level Security
ALTER TABLE public."manufacturer_return_policies" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."manufacturer_return_policies";
CREATE POLICY "all policy"
    ON public."manufacturer_return_policies"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_manufacturer_return_policies" ON public."manufacturer_return_policies";
CREATE POLICY "service_role_all_manufacturer_return_policies"
    ON public."manufacturer_return_policies"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

