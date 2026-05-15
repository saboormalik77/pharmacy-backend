-- ============================================================
-- Table   : public.marketplace_deals
-- ============================================================

DROP TABLE IF EXISTS public."marketplace_deals" CASCADE;

CREATE TABLE public."marketplace_deals" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "deal_number" varchar(20) NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "category" varchar(100) NOT NULL,
    "ndc" varchar(50),
    "quantity" integer NOT NULL,
    "unit" varchar(20) DEFAULT 'bottles'::character varying NOT NULL,
    "original_price" numeric NOT NULL,
    "deal_price" numeric NOT NULL,
    "distributor_id" uuid,
    "distributor_name" varchar(255) NOT NULL,
    "expiry_date" date NOT NULL,
    "posted_date" date DEFAULT CURRENT_DATE NOT NULL,
    "status" varchar(20) DEFAULT 'active'::character varying NOT NULL,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "image_url" text,
    "original_quantity" integer NOT NULL,
    "is_deal_of_the_day" boolean DEFAULT false,
    "deal_of_the_day_until" timestamptz,
    "minimum_buy_quantity" integer DEFAULT 1,
    "is_deal_of_the_week" boolean DEFAULT false,
    "deal_of_the_week_until" timestamptz,
    "is_deal_of_the_month" boolean DEFAULT false,
    "deal_of_the_month_until" timestamptz,
    CONSTRAINT "marketplace_deals_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "chk_minimum_buy_quantity_positive" CHECK (minimum_buy_quantity >= 1);

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "chk_original_quantity" CHECK (original_quantity > 0);

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_deal_price_check" CHECK (deal_price > 0::numeric);

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_original_price_check" CHECK (original_price > 0::numeric);

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_quantity_check" CHECK (quantity > 0) NOT VALID;

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'sold'::character varying, 'expired'::character varying]::text[]));

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_unit_check" CHECK (unit::text = ANY (ARRAY['bottles'::character varying, 'boxes'::character varying, 'units'::character varying, 'packs'::character varying]::text[]));

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_distributor_id_fkey" FOREIGN KEY (distributor_id) REFERENCES reverse_distributors(id) ON DELETE SET NULL;

ALTER TABLE public."marketplace_deals"
    ADD CONSTRAINT "marketplace_deals_deal_number_key" UNIQUE (deal_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_category ON public.marketplace_deals USING btree (category);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_deal_of_day ON public.marketplace_deals USING btree (is_deal_of_the_day) WHERE (is_deal_of_the_day = true);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_deal_of_month ON public.marketplace_deals USING btree (is_deal_of_the_month) WHERE (is_deal_of_the_month = true);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_deal_of_week ON public.marketplace_deals USING btree (is_deal_of_the_week) WHERE (is_deal_of_the_week = true);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_distributor ON public.marketplace_deals USING btree (distributor_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_expiry ON public.marketplace_deals USING btree (expiry_date);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_image ON public.marketplace_deals USING btree (image_url) WHERE (image_url IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_posted ON public.marketplace_deals USING btree (posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_product ON public.marketplace_deals USING btree (product_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_search ON public.marketplace_deals USING gin (to_tsvector('english'::regconfig, (((((product_name)::text || ' '::text) || (distributor_name)::text) || ' '::text) || (category)::text)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_deals_single_deal_of_day ON public.marketplace_deals USING btree (id) WHERE (is_deal_of_the_day = true);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_deals_single_deal_of_month ON public.marketplace_deals USING btree (id) WHERE (is_deal_of_the_month = true);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_deals_single_deal_of_week ON public.marketplace_deals USING btree (id) WHERE (is_deal_of_the_week = true);
CREATE INDEX IF NOT EXISTS idx_marketplace_deals_status ON public.marketplace_deals USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_deals_deal_number_key ON public.marketplace_deals USING btree (deal_number);

-- Row Level Security
ALTER TABLE public."marketplace_deals" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access marketplace_deals" ON public."marketplace_deals";
CREATE POLICY "Service role can access marketplace_deals"
    ON public."marketplace_deals"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."marketplace_deals";
CREATE POLICY "all policy"
    ON public."marketplace_deals"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

