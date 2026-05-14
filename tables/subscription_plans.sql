-- ============================================================
-- Table   : public.subscription_plans
-- ============================================================

DROP TABLE IF EXISTS public."subscription_plans" CASCADE;

CREATE TABLE public."subscription_plans" (
    "id" varchar(50) NOT NULL,
    "name" varchar(100) NOT NULL,
    "description" text,
    "price_monthly" numeric DEFAULT 0 NOT NULL,
    "price_yearly" numeric DEFAULT 0 NOT NULL,
    "stripe_price_id_monthly" varchar(255),
    "stripe_price_id_yearly" varchar(255),
    "stripe_product_id" varchar(255),
    "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "max_documents" integer,
    "max_distributors" integer,
    "analytics_features" jsonb DEFAULT '[]'::jsonb,
    "support_level" varchar(50),
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."subscription_plans"
    ADD CONSTRAINT "subscription_plans_id_check" CHECK (id::text = ANY (ARRAY['free'::character varying, 'basic'::character varying, 'premium'::character varying, 'enterprise'::character varying]::text[]));

ALTER TABLE public."subscription_plans"
    ADD CONSTRAINT "subscription_plans_support_level_check" CHECK (support_level::text = ANY (ARRAY['email'::character varying, 'priority'::character varying, 'dedicated'::character varying]::text[]));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON public.subscription_plans USING btree (is_active);

-- Policies
DROP POLICY IF EXISTS "service_role_all_subscription_plans" ON public."subscription_plans";
CREATE POLICY "service_role_all_subscription_plans"
    ON public."subscription_plans"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

