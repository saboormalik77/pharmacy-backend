-- ============================================================
-- Table   : public.subscriptions
-- ============================================================

DROP TABLE IF EXISTS public."subscriptions" CASCADE;

CREATE TABLE public."subscriptions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "plan" varchar(50) NOT NULL,
    "status" varchar(50) DEFAULT 'trial'::character varying,
    "current_period_start" timestamptz,
    "current_period_end" timestamptz,
    "cancel_at_period_end" boolean DEFAULT false,
    "payment_method" jsonb,
    "price" numeric,
    "billing_interval" varchar(20),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "stripe_customer_id" varchar(255),
    "stripe_subscription_id" varchar(255),
    "stripe_price_id" varchar(255),
    "stripe_current_period_start" timestamptz,
    "stripe_current_period_end" timestamptz,
    "stripe_cancel_at_period_end" boolean DEFAULT false,
    "stripe_canceled_at" timestamptz,
    "stripe_ended_at" timestamptz,
    "stripe_latest_invoice_id" varchar(255),
    "stripe_payment_method_id" varchar(255),
    "trial_start" timestamptz,
    "trial_end" timestamptz,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."subscriptions"
    ADD CONSTRAINT "subscriptions_billing_interval_check" CHECK (billing_interval::text = ANY (ARRAY['monthly'::character varying::text, 'yearly'::character varying::text]));

ALTER TABLE public."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_check" CHECK (plan::text = ANY (ARRAY['free'::character varying::text, 'basic'::character varying::text, 'premium'::character varying::text, 'enterprise'::character varying::text]));

ALTER TABLE public."subscriptions"
    ADD CONSTRAINT "subscriptions_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'trial'::character varying::text, 'expired'::character varying::text, 'cancelled'::character varying::text, 'past_due'::character varying::text]));

ALTER TABLE public."subscriptions"
    ADD CONSTRAINT "subscriptions_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_pharmacy_id ON public.subscriptions USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);

-- Policies
DROP POLICY IF EXISTS "service_role_all_subscriptions" ON public."subscriptions";
CREATE POLICY "service_role_all_subscriptions"
    ON public."subscriptions"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

