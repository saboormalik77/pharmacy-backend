-- ============================================================
-- Table   : public.inventory_reminders
-- ============================================================

DROP TABLE IF EXISTS public."inventory_reminders" CASCADE;

CREATE TABLE public."inventory_reminders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "reminder_type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "scheduled_for" timestamptz NOT NULL,
    "sent_at" timestamptz,
    "status" varchar(20) DEFAULT 'pending'::character varying,
    "total_items" integer DEFAULT 0,
    "total_potential_value" numeric DEFAULT 0,
    "items_summary" jsonb,
    "email_sent_to" varchar(255),
    "email_opened_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "inventory_reminders_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."inventory_reminders"
    ADD CONSTRAINT "inventory_reminders_reminder_type_check" CHECK (reminder_type::text = ANY (ARRAY['monthly_review'::character varying, 'expiration_warning'::character varying, 'return_opportunity'::character varying, 'price_increase'::character varying]::text[]));

ALTER TABLE public."inventory_reminders"
    ADD CONSTRAINT "inventory_reminders_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'sent'::character varying, 'cancelled'::character varying, 'failed'::character varying]::text[]));

ALTER TABLE public."inventory_reminders"
    ADD CONSTRAINT "inventory_reminders_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_reminders_pharmacy_id ON public.inventory_reminders USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reminders_reminder_type ON public.inventory_reminders USING btree (reminder_type);
CREATE INDEX IF NOT EXISTS idx_inventory_reminders_scheduled_for ON public.inventory_reminders USING btree (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_inventory_reminders_status ON public.inventory_reminders USING btree (status);

-- Row Level Security
ALTER TABLE public."inventory_reminders" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Pharmacies can view own reminders" ON public."inventory_reminders";
CREATE POLICY "Pharmacies can view own reminders"
    ON public."inventory_reminders"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to reminders" ON public."inventory_reminders";
CREATE POLICY "Service role full access to reminders"
    ON public."inventory_reminders"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."inventory_reminders";
CREATE POLICY "all policy"
    ON public."inventory_reminders"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

