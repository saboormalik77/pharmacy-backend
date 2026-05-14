-- ============================================================
-- MASTER FILE: All tables, indexes, constraints, and policies
-- Tables: 80
-- Run this file to recreate the entire public schema
-- ============================================================

-- ============================================================
-- Table   : public.admin
-- ============================================================

DROP TABLE IF EXISTS public."admin" CASCADE;

CREATE TABLE public."admin" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" text NOT NULL,
    "name" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'support'::character varying,
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "reset_token" text,
    "reset_token_expires_at" timestamptz,
    "permissions" jsonb DEFAULT '[]'::jsonb,
    "buying_group_id" uuid,
    "address" text,
    "contact_phone" text,
    "notes" text,
    CONSTRAINT "admin_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."admin"
    ADD CONSTRAINT "admin_role_check" CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'manager'::character varying, 'reviewer'::character varying, 'support'::character varying, 'processor'::character varying, 'warehouse_staff'::character varying, 'sales_rep'::character varying]::text[]));

ALTER TABLE public."admin"
    ADD CONSTRAINT "admin_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."admin"
    ADD CONSTRAINT "admin_email_key" UNIQUE (email);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS admin_email_key ON public.admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_admin_buying_group_id ON public.admin USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_admin_is_active ON public.admin USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_admin_reset_token ON public.admin USING btree (reset_token) WHERE (reset_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin USING btree (role);

-- Row Level Security
ALTER TABLE public."admin" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."admin";
CREATE POLICY "Allow all access via service role"
    ON public."admin"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for anon users" ON public."admin";
CREATE POLICY "Enable read access for anon users"
    ON public."admin"
    AS PERMISSIVE
    FOR SELECT TO 16480
    USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public."admin";
CREATE POLICY "Enable read access for authenticated users"
    ON public."admin"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (true);

DROP POLICY IF EXISTS "all policy" ON public."admin";
CREATE POLICY "all policy"
    ON public."admin"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.admin_recent_activity
-- ============================================================

DROP TABLE IF EXISTS public."admin_recent_activity" CASCADE;

CREATE TABLE public."admin_recent_activity" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "activity_type" varchar(50) NOT NULL,
    "entity_id" uuid NOT NULL,
    "entity_name" varchar(500),
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "is_read" boolean DEFAULT false,
    "read_at" timestamptz,
    CONSTRAINT "admin_recent_activity_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."admin_recent_activity"
    ADD CONSTRAINT "admin_recent_activity_activity_type_check" CHECK (activity_type::text = ANY (ARRAY['document_uploaded'::character varying::text, 'product_added'::character varying::text, 'pharmacy_registered'::character varying::text]));

ALTER TABLE public."admin_recent_activity"
    ADD CONSTRAINT "admin_recent_activity_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_activity_type ON public.admin_recent_activity USING btree (activity_type);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_created_at ON public.admin_recent_activity USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_entity_id ON public.admin_recent_activity USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_is_read ON public.admin_recent_activity USING btree (is_read);
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_pharmacy_id ON public.admin_recent_activity USING btree (pharmacy_id);

-- Row Level Security
ALTER TABLE public."admin_recent_activity" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "admin_recent_activity_insert_policy" ON public."admin_recent_activity";
CREATE POLICY "admin_recent_activity_insert_policy"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR INSERT TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "admin_recent_activity_select_policy" ON public."admin_recent_activity";
CREATE POLICY "admin_recent_activity_select_policy"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "all policy" ON public."admin_recent_activity";
CREATE POLICY "all policy"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_admin_recent_activity" ON public."admin_recent_activity";
CREATE POLICY "service_role_all_admin_recent_activity"
    ON public."admin_recent_activity"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.admin_settings
-- ============================================================

DROP TABLE IF EXISTS public."admin_settings" CASCADE;

CREATE TABLE public."admin_settings" (
    "id" integer DEFAULT nextval('admin_settings_id_seq'::regclass) NOT NULL,
    "site_name" varchar(255) DEFAULT 'PharmAdmin'::character varying,
    "site_email" varchar(255) DEFAULT 'admin@pharmadmin.com'::character varying,
    "timezone" varchar(100) DEFAULT 'America/New_York'::character varying,
    "language" varchar(10) DEFAULT 'en'::character varying,
    "email_notifications" boolean DEFAULT true,
    "document_approval_notif" boolean DEFAULT true,
    "payment_notif" boolean DEFAULT true,
    "shipment_notif" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "warehouse_name" text,
    "warehouse_street" text,
    "warehouse_city" text,
    "warehouse_state" text,
    "warehouse_zip" text,
    "warehouse_country" text DEFAULT 'US'::text,
    "warehouse_phone" text,
    "warehouse_contact_name" text,
    "business_name" text,
    "logo_url" text,
    "buying_group_id" uuid,
    CONSTRAINT "admin_settings_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."admin_settings"
    ADD CONSTRAINT "admin_settings_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_settings_buying_group_id ON public.admin_settings USING btree (buying_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_buying_group ON public.admin_settings USING btree (buying_group_id) WHERE (buying_group_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_unique_global ON public.admin_settings USING btree (id) WHERE (buying_group_id IS NULL);

-- Row Level Security
ALTER TABLE public."admin_settings" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access admin_settings" ON public."admin_settings";
CREATE POLICY "Service role can access admin_settings"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."admin_settings";
CREATE POLICY "all policy"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "allpolicy" ON public."admin_settings";
CREATE POLICY "allpolicy"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_admin_settings" ON public."admin_settings";
CREATE POLICY "service_role_all_admin_settings"
    ON public."admin_settings"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.batch_workflow_steps
-- ============================================================

DROP TABLE IF EXISTS public."batch_workflow_steps" CASCADE;

CREATE TABLE public."batch_workflow_steps" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "batch_id" uuid NOT NULL,
    "step_key" text NOT NULL,
    "completed_at" timestamptz DEFAULT now() NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "batch_workflow_steps_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."batch_workflow_steps"
    ADD CONSTRAINT "batch_workflow_steps_step_key_check" CHECK (step_key = ANY (ARRAY['cardinal_generated'::text, 'cardinal_sent'::text, 'debit_memos_created'::text, 'ra_requested'::text]));

ALTER TABLE public."batch_workflow_steps"
    ADD CONSTRAINT "batch_workflow_steps_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES return_batches(id) ON DELETE CASCADE;

ALTER TABLE public."batch_workflow_steps"
    ADD CONSTRAINT "batch_workflow_steps_batch_id_step_key_key" UNIQUE (batch_id, step_key);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS batch_workflow_steps_batch_id_step_key_key ON public.batch_workflow_steps USING btree (batch_id, step_key);
CREATE INDEX IF NOT EXISTS idx_bws_batch_id ON public.batch_workflow_steps USING btree (batch_id);

-- Row Level Security
ALTER TABLE public."batch_workflow_steps" ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Table   : public.buying_group_domains
-- ============================================================

DROP TABLE IF EXISTS public."buying_group_domains" CASCADE;

CREATE TABLE public."buying_group_domains" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "buying_group_id" uuid NOT NULL,
    "domain" varchar(255) NOT NULL,
    "admin_hostname" varchar(255) DEFAULT NULL::character varying,
    "pharmacy_hostname" varchar(255) DEFAULT NULL::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "buying_group_domains_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."buying_group_domains"
    ADD CONSTRAINT "buying_group_domains_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE CASCADE;

ALTER TABLE public."buying_group_domains"
    ADD CONSTRAINT "buying_group_domains_domain_key" UNIQUE (domain);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS buying_group_domains_domain_key ON public.buying_group_domains USING btree (domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_admin_hostname ON public.buying_group_domains USING btree (admin_hostname) WHERE (admin_hostname IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bgd_buying_group_id ON public.buying_group_domains USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_bgd_domain ON public.buying_group_domains USING btree (domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_pharmacy_hostname ON public.buying_group_domains USING btree (pharmacy_hostname) WHERE (pharmacy_hostname IS NOT NULL);

-- Row Level Security
ALTER TABLE public."buying_group_domains" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."buying_group_domains";
CREATE POLICY "all policy"
    ON public."buying_group_domains"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_buying_group_domains" ON public."buying_group_domains";
CREATE POLICY "service_role_all_buying_group_domains"
    ON public."buying_group_domains"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.credit_memo_analysis
-- ============================================================

DROP TABLE IF EXISTS public."credit_memo_analysis" CASCADE;

CREATE TABLE public."credit_memo_analysis" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "debit_memo_id" uuid,
    "credit_memo_url" text,
    "ai_status" text DEFAULT 'completed'::text NOT NULL,
    "ai_confidence" numeric,
    "ai_extracted_total" numeric,
    "ai_extracted_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "ai_error_message" text,
    "human_reviewed" boolean DEFAULT false NOT NULL,
    "human_approved" boolean,
    "reviewed_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "credit_memo_analysis_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."credit_memo_analysis"
    ADD CONSTRAINT "credit_memo_analysis_ai_status_check" CHECK (ai_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'manual_review'::text]));

ALTER TABLE public."credit_memo_analysis"
    ADD CONSTRAINT "credit_memo_analysis_debit_memo_id_fkey" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cma_created_at ON public.credit_memo_analysis USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cma_debit_memo ON public.credit_memo_analysis USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_cma_status ON public.credit_memo_analysis USING btree (ai_status);

-- Row Level Security
ALTER TABLE public."credit_memo_analysis" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."credit_memo_analysis";
CREATE POLICY "Allow all access via service role"
    ON public."credit_memo_analysis"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


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


-- ============================================================
-- Table   : public.custom_package_items
-- ============================================================

DROP TABLE IF EXISTS public."custom_package_items" CASCADE;

CREATE TABLE public."custom_package_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_id" uuid NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "price_per_unit" numeric NOT NULL,
    "total_value" numeric NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "full" integer DEFAULT 0 NOT NULL,
    "partial" integer DEFAULT 0 NOT NULL,
    "quantity" integer NOT NULL,
    CONSTRAINT "custom_package_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."custom_package_items"
    ADD CONSTRAINT "custom_package_items_package_id_fkey" FOREIGN KEY (package_id) REFERENCES custom_packages(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_package_items_ndc ON public.custom_package_items USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_custom_package_items_package_id ON public.custom_package_items USING btree (package_id);

-- Policies
DROP POLICY IF EXISTS "service_role_all_custom_package_items" ON public."custom_package_items";
CREATE POLICY "service_role_all_custom_package_items"
    ON public."custom_package_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.custom_packages
-- ============================================================

DROP TABLE IF EXISTS public."custom_packages" CASCADE;

CREATE TABLE public."custom_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_number" varchar(100) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "distributor_name" varchar(255) NOT NULL,
    "distributor_id" uuid,
    "total_items" integer DEFAULT 0,
    "total_estimated_value" numeric DEFAULT 0,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "status" boolean DEFAULT false NOT NULL,
    "delivery_date" timestamptz,
    "received_by" varchar(255),
    "delivery_condition" varchar(50),
    "delivery_notes" text,
    "tracking_number" varchar(100),
    "carrier" varchar(50),
    "fee_rate" numeric,
    "fee_amount" numeric,
    "net_estimated_value" numeric,
    "fee_duration" integer,
    CONSTRAINT "custom_packages_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_carrier_check" CHECK (carrier::text = ANY (ARRAY['UPS'::character varying, 'FedEx'::character varying, 'USPS'::character varying, 'DHL'::character varying, 'Other'::character varying]::text[]));

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_delivery_condition_check" CHECK (delivery_condition::text = ANY (ARRAY['good'::character varying, 'damaged'::character varying, 'partial'::character varying, 'missing_items'::character varying, 'other'::character varying]::text[]));

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_distributor_id_fkey" FOREIGN KEY (distributor_id) REFERENCES reverse_distributors(id);

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."custom_packages"
    ADD CONSTRAINT "custom_packages_package_number_key" UNIQUE (package_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS custom_packages_package_number_key ON public.custom_packages USING btree (package_number);
CREATE INDEX IF NOT EXISTS idx_custom_packages_carrier ON public.custom_packages USING btree (carrier);
CREATE INDEX IF NOT EXISTS idx_custom_packages_delivery_date ON public.custom_packages USING btree (delivery_date);
CREATE INDEX IF NOT EXISTS idx_custom_packages_distributor_id ON public.custom_packages USING btree (distributor_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_package_number ON public.custom_packages USING btree (package_number);
CREATE INDEX IF NOT EXISTS idx_custom_packages_pharmacy_id ON public.custom_packages USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_status ON public.custom_packages USING btree (status);
CREATE INDEX IF NOT EXISTS idx_custom_packages_tracking_number ON public.custom_packages USING btree (tracking_number);

-- Policies
DROP POLICY IF EXISTS "service_role_all_custom_packages" ON public."custom_packages";
CREATE POLICY "service_role_all_custom_packages"
    ON public."custom_packages"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


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


-- ============================================================
-- Table   : public.destruction_records
-- ============================================================

DROP TABLE IF EXISTS public."destruction_records" CASCADE;

CREATE TABLE public."destruction_records" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "transaction_item_id" uuid,
    "ndc" varchar(13),
    "product_name" text,
    "manufacturer" text,
    "lot_number" text,
    "quantity" integer DEFAULT 1,
    "weight_lbs" numeric,
    "destruction_reason" text DEFAULT 'non_returnable'::text NOT NULL,
    "status" USER-DEFINED DEFAULT 'pending'::destruction_status NOT NULL,
    "federal_form_number" text,
    "destruction_company" text,
    "scheduled_date" date,
    "picked_up_at" timestamptz,
    "destroyed_at" timestamptz,
    "form_url" text,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "destruction_records_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."destruction_records"
    ADD CONSTRAINT "destruction_records_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."destruction_records"
    ADD CONSTRAINT "destruction_records_transaction_item_id_fkey" FOREIGN KEY (transaction_item_id) REFERENCES return_transaction_items(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_destruction_records_created_at ON public.destruction_records USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_destruction_records_ndc ON public.destruction_records USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_destruction_records_pharmacy ON public.destruction_records USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_destruction_records_status ON public.destruction_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_destruction_records_transaction_item ON public.destruction_records USING btree (transaction_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_destruction_records_transaction_item ON public.destruction_records USING btree (transaction_item_id) WHERE (transaction_item_id IS NOT NULL);

-- Row Level Security
ALTER TABLE public."destruction_records" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."destruction_records";
CREATE POLICY "Allow all access via service role"
    ON public."destruction_records"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."destruction_records";
CREATE POLICY "all policy"
    ON public."destruction_records"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


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


-- ============================================================
-- Table   : public.inventory_items
-- ============================================================

DROP TABLE IF EXISTS public."inventory_items" CASCADE;

CREATE TABLE public."inventory_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "location" varchar(255),
    "boxes" integer,
    "tablets_per_box" integer,
    "status" varchar(50) DEFAULT 'active'::character varying,
    "days_until_expiration" integer,
    "added_date" timestamptz DEFAULT now(),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."inventory_items"
    ADD CONSTRAINT "inventory_items_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'expiring_soon'::character varying::text, 'expired'::character varying::text]));

ALTER TABLE public."inventory_items"
    ADD CONSTRAINT "inventory_items_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;


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


-- ============================================================
-- Table   : public.main_admin
-- ============================================================

DROP TABLE IF EXISTS public."main_admin" CASCADE;

CREATE TABLE public."main_admin" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" text NOT NULL,
    "name" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "main_admin_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."main_admin"
    ADD CONSTRAINT "main_admin_email_key" UNIQUE (email);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_main_admin_email ON public.main_admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_main_admin_is_active ON public.main_admin USING btree (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS main_admin_email_key ON public.main_admin USING btree (email);

-- Row Level Security
ALTER TABLE public."main_admin" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."main_admin";
CREATE POLICY "all policy"
    ON public."main_admin"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_main_admin" ON public."main_admin";
CREATE POLICY "service_role_all_main_admin"
    ON public."main_admin"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.manufacturer_policies
-- ============================================================

DROP TABLE IF EXISTS public."manufacturer_policies" CASCADE;

CREATE TABLE public."manufacturer_policies" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "labeler_id" varchar(10) NOT NULL,
    "labeler_type" text DEFAULT 'generic'::text NOT NULL,
    "manufacturer_name" text NOT NULL,
    "address_1" text,
    "address_2" text,
    "city" text,
    "state" text,
    "zip" text,
    "main_contact" text,
    "main_phone" text,
    "fax" text,
    "credit_request_email" text,
    "contact_2_name" text,
    "contact_2_phone" text,
    "contact_2_email" text,
    "average_pay_percent" numeric,
    "average_days_to_pay" integer,
    "verified_date" date,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "manufacturer_policies_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."manufacturer_policies"
    ADD CONSTRAINT "manufacturer_policies_labeler_type_check" CHECK (labeler_type = ANY (ARRAY['generic'::text, 'brand'::text]));

ALTER TABLE public."manufacturer_policies"
    ADD CONSTRAINT "manufacturer_policies_labeler_id_key" UNIQUE (labeler_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_labeler_id ON public.manufacturer_policies USING btree (labeler_id);
CREATE INDEX IF NOT EXISTS idx_mp_manufacturer_name ON public.manufacturer_policies USING btree (manufacturer_name);
CREATE UNIQUE INDEX IF NOT EXISTS manufacturer_policies_labeler_id_key ON public.manufacturer_policies USING btree (labeler_id);

-- Row Level Security
ALTER TABLE public."manufacturer_policies" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."manufacturer_policies";
CREATE POLICY "all policy"
    ON public."manufacturer_policies"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_manufacturer_policies" ON public."manufacturer_policies";
CREATE POLICY "service_role_all_manufacturer_policies"
    ON public."manufacturer_policies"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.manufacturer_policy_notes
-- ============================================================

DROP TABLE IF EXISTS public."manufacturer_policy_notes" CASCADE;

CREATE TABLE public."manufacturer_policy_notes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "manufacturer_policy_id" uuid NOT NULL,
    "note_date" date DEFAULT CURRENT_DATE NOT NULL,
    "author_initials" varchar(10),
    "note_text" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "manufacturer_policy_notes_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."manufacturer_policy_notes"
    ADD CONSTRAINT "manufacturer_policy_notes_manufacturer_policy_id_fkey" FOREIGN KEY (manufacturer_policy_id) REFERENCES manufacturer_policies(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mpn_policy_id ON public.manufacturer_policy_notes USING btree (manufacturer_policy_id);

-- Row Level Security
ALTER TABLE public."manufacturer_policy_notes" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."manufacturer_policy_notes";
CREATE POLICY "all policy"
    ON public."manufacturer_policy_notes"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_manufacturer_policy_notes" ON public."manufacturer_policy_notes";
CREATE POLICY "service_role_all_manufacturer_policy_notes"
    ON public."manufacturer_policy_notes"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


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
    ADD CONSTRAINT "manufacturer_return_policies_reimbursement_type_check" CHECK (reimbursement_type = ANY (ARRAY['batch'::text, 'per_item'::text]));

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


-- ============================================================
-- Table   : public.marketplace_listings
-- ============================================================

DROP TABLE IF EXISTS public."marketplace_listings" CASCADE;

CREATE TABLE public."marketplace_listings" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "seller_id" uuid NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "drug_name" varchar(500) NOT NULL,
    "strength" varchar(100),
    "manufacturer" varchar(255),
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "price_per_unit" numeric NOT NULL,
    "wac_price" numeric,
    "condition" varchar(100),
    "photos" text[],
    "status" varchar(50) DEFAULT 'pending_approval'::character varying,
    "location" jsonb,
    "visibility" varchar(20) DEFAULT 'public'::character varying,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."marketplace_listings"
    ADD CONSTRAINT "marketplace_listings_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'sold'::character varying::text, 'expired'::character varying::text, 'pending_approval'::character varying::text]));

ALTER TABLE public."marketplace_listings"
    ADD CONSTRAINT "marketplace_listings_visibility_check" CHECK (visibility::text = ANY (ARRAY['public'::character varying::text, 'private'::character varying::text]));

ALTER TABLE public."marketplace_listings"
    ADD CONSTRAINT "marketplace_listings_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES pharmacy(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.marketplace_order_items
-- ============================================================

DROP TABLE IF EXISTS public."marketplace_order_items" CASCADE;

CREATE TABLE public."marketplace_order_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_id" uuid NOT NULL,
    "deal_id" uuid NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "ndc" varchar(50),
    "category" varchar(100),
    "distributor" varchar(255),
    "quantity" integer NOT NULL,
    "unit_price" numeric NOT NULL,
    "original_price" numeric NOT NULL,
    "line_total" numeric NOT NULL,
    "line_savings" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "marketplace_order_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_line_savings_check" CHECK (line_savings >= 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_line_total_check" CHECK (line_total >= 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_original_price_check" CHECK (original_price > 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_quantity_check" CHECK (quantity > 0);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_unit_price_check" CHECK (unit_price > 0::numeric);

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES marketplace_deals(id) ON DELETE RESTRICT;

ALTER TABLE public."marketplace_order_items"
    ADD CONSTRAINT "marketplace_order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_deal ON public.marketplace_order_items USING btree (deal_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.marketplace_order_items USING btree (order_id);

-- Row Level Security
ALTER TABLE public."marketplace_order_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access marketplace_order_items" ON public."marketplace_order_items";
CREATE POLICY "Service role can access marketplace_order_items"
    ON public."marketplace_order_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."marketplace_order_items";
CREATE POLICY "all policy"
    ON public."marketplace_order_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.marketplace_orders
-- ============================================================

DROP TABLE IF EXISTS public."marketplace_orders" CASCADE;

CREATE TABLE public."marketplace_orders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_number" varchar(20) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(30) DEFAULT 'pending'::character varying NOT NULL,
    "subtotal" numeric NOT NULL,
    "tax_amount" numeric DEFAULT 0 NOT NULL,
    "tax_rate" numeric DEFAULT 0.08 NOT NULL,
    "shipping_amount" numeric DEFAULT 0 NOT NULL,
    "discount_amount" numeric DEFAULT 0 NOT NULL,
    "total_amount" numeric NOT NULL,
    "total_savings" numeric DEFAULT 0 NOT NULL,
    "stripe_checkout_session_id" varchar(255),
    "stripe_payment_intent_id" varchar(255),
    "stripe_customer_id" varchar(255),
    "stripe_payment_method_id" varchar(255),
    "stripe_payment_status" varchar(50),
    "stripe_receipt_url" text,
    "payment_method_type" varchar(50),
    "payment_method_last4" varchar(4),
    "payment_method_brand" varchar(50),
    "shipping_address" jsonb,
    "shipping_method" varchar(100),
    "tracking_number" varchar(255),
    "notes" text,
    "internal_notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "paid_at" timestamptz,
    "shipped_at" timestamptz,
    "delivered_at" timestamptz,
    "cancelled_at" timestamptz,
    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_discount_amount_check" CHECK (discount_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_shipping_amount_check" CHECK (shipping_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[]));

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_subtotal_check" CHECK (subtotal >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_tax_amount_check" CHECK (tax_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_total_amount_check" CHECK (total_amount >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_total_savings_check" CHECK (total_savings >= 0::numeric);

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

ALTER TABLE public."marketplace_orders"
    ADD CONSTRAINT "marketplace_orders_order_number_key" UNIQUE (order_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created ON public.marketplace_orders USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_pharmacy ON public.marketplace_orders USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON public.marketplace_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_payment ON public.marketplace_orders USING btree (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_session ON public.marketplace_orders USING btree (stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_orders_order_number_key ON public.marketplace_orders USING btree (order_number);

-- Row Level Security
ALTER TABLE public."marketplace_orders" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access marketplace_orders" ON public."marketplace_orders";
CREATE POLICY "Service role can access marketplace_orders"
    ON public."marketplace_orders"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."marketplace_orders";
CREATE POLICY "all policy"
    ON public."marketplace_orders"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.ndc_packages
-- ============================================================

DROP TABLE IF EXISTS public."ndc_packages" CASCADE;

CREATE TABLE public."ndc_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "product_ndc" varchar(20) NOT NULL,
    "ndc_package_code" varchar(20) NOT NULL,
    "package_description" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ndc_packages_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_packages_ndc_package_code ON public.ndc_packages USING btree (ndc_package_code);
CREATE INDEX IF NOT EXISTS idx_ndc_packages_product_ndc ON public.ndc_packages USING btree (product_ndc);

-- Policies
DROP POLICY IF EXISTS "service_role_all_ndc_packages" ON public."ndc_packages";
CREATE POLICY "service_role_all_ndc_packages"
    ON public."ndc_packages"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.ndc_payment_history
-- ============================================================

DROP TABLE IF EXISTS public."ndc_payment_history" CASCADE;

CREATE TABLE public."ndc_payment_history" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(20) NOT NULL,
    "ndc_normalized" varchar(11) NOT NULL,
    "debit_memo_id" uuid,
    "ask_price" numeric NOT NULL,
    "received_price" numeric NOT NULL,
    "payment_ratio" numeric,
    "manufacturer" text,
    "product_name" text,
    "pharmacy_name" text,
    "ask_date" date,
    "receive_date" date,
    "payment_method" text,
    "is_partial" boolean DEFAULT false NOT NULL,
    "percentage_returned" numeric,
    "ai_extracted" boolean DEFAULT false NOT NULL,
    "ai_confidence" numeric,
    "source" text DEFAULT 'manual'::text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "ndc_payment_history_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ndc_payment_history"
    ADD CONSTRAINT "ndc_payment_history_debit_memo_id_fkey" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nph_created_at_desc ON public.ndc_payment_history USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nph_debit_memo ON public.ndc_payment_history USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_nph_manufacturer ON public.ndc_payment_history USING btree (manufacturer);
CREATE INDEX IF NOT EXISTS idx_nph_ndc_normalized ON public.ndc_payment_history USING btree (ndc_normalized);

-- Row Level Security
ALTER TABLE public."ndc_payment_history" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."ndc_payment_history";
CREATE POLICY "Allow all access via service role"
    ON public."ndc_payment_history"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.ndc_price_history
-- ============================================================

DROP TABLE IF EXISTS public."ndc_price_history" CASCADE;

CREATE TABLE public."ndc_price_history" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(13) NOT NULL,
    "old_price" numeric,
    "new_price" numeric NOT NULL,
    "price_source" text,
    "changed_by" uuid,
    "changed_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "ndc_price_history_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nph_changed_at ON public.ndc_price_history USING btree (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nph_ndc ON public.ndc_price_history USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_nph_source ON public.ndc_price_history USING btree (price_source);

-- Row Level Security
ALTER TABLE public."ndc_price_history" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."ndc_price_history";
CREATE POLICY "all policy"
    ON public."ndc_price_history"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ndc_price_history" ON public."ndc_price_history";
CREATE POLICY "service_role_all_ndc_price_history"
    ON public."ndc_price_history"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.ndc_pricing
-- ============================================================

DROP TABLE IF EXISTS public."ndc_pricing" CASCADE;

CREATE TABLE public."ndc_pricing" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(20) NOT NULL,
    "ndc_normalized" varchar(11) NOT NULL,
    "product_name" text,
    "manufacturer" text,
    "current_price" numeric,
    "last_price" numeric,
    "estimated_store_price" numeric,
    "last_reimbursement" numeric,
    "price_source" text,
    "close_out_destination" text,
    "last_price_update" timestamptz,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "ai_confidence" numeric,
    "ask_received_ratio" numeric,
    "avg_ask_price" numeric,
    "avg_received_price" numeric,
    "last_5_payments" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "last_ask_received_update" timestamptz,
    "manufacturer_reliability" text,
    "max_received_price" numeric,
    "min_received_price" numeric,
    "payment_sample_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "ndc_pricing_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ndc_pricing"
    ADD CONSTRAINT "ndc_pricing_close_out_destination_check" CHECK (close_out_destination IS NULL OR (close_out_destination = ANY (ARRAY['inmar'::text, 'qualanex'::text, 'pharmalink'::text, 'other'::text])));

ALTER TABLE public."ndc_pricing"
    ADD CONSTRAINT "ndc_pricing_reliability_check" CHECK (manufacturer_reliability IS NULL OR (manufacturer_reliability = ANY (ARRAY['excellent'::text, 'good'::text, 'average'::text, 'poor'::text, 'unknown'::text])));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc ON public.ndc_pricing USING btree (ndc);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ndc_pricing_normalized ON public.ndc_pricing USING btree (ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_product_name ON public.ndc_pricing USING gin (to_tsvector('english'::regconfig, COALESCE(product_name, ''::text)));

-- Row Level Security
ALTER TABLE public."ndc_pricing" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."ndc_pricing";
CREATE POLICY "all policy"
    ON public."ndc_pricing"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ndc_pricing" ON public."ndc_pricing";
CREATE POLICY "service_role_all_ndc_pricing"
    ON public."ndc_pricing"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.ndc_pricing_index
-- ============================================================

DROP TABLE IF EXISTS public."ndc_pricing_index" CASCADE;

CREATE TABLE public."ndc_pricing_index" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc_original" varchar(50) NOT NULL,
    "ndc_normalized" varchar(20) NOT NULL,
    "product_name" text,
    "distributor_id" uuid,
    "distributor_name" varchar(255) NOT NULL,
    "distributor_email" varchar(255),
    "distributor_phone" varchar(50),
    "distributor_location" text,
    "price_per_unit" numeric,
    "credit_amount" numeric,
    "quantity" integer,
    "is_full_record" boolean DEFAULT false NOT NULL,
    "is_partial_record" boolean DEFAULT false NOT NULL,
    "source_report_id" uuid,
    "report_date" date,
    "uploaded_at" timestamptz,
    "source_created_at" timestamptz,
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ndc_pricing_index_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ndc_pricing_index"
    ADD CONSTRAINT "ndc_pricing_index_source_report_id_fkey" FOREIGN KEY (source_report_id) REFERENCES return_reports(id) ON DELETE SET NULL;

ALTER TABLE public."ndc_pricing_index"
    ADD CONSTRAINT "ndc_pricing_index_ndc_normalized_distributor_name_is_full_r_key" UNIQUE (ndc_normalized, distributor_name, is_full_record, is_partial_record);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_distributor ON public.ndc_pricing_index USING btree (distributor_id);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_distributor_name ON public.ndc_pricing_index USING btree (distributor_name);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_dist_name ON public.ndc_pricing_index USING btree (ndc_normalized, distributor_name);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_normalized ON public.ndc_pricing_index USING btree (ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_orig_trgm ON public.ndc_pricing_index USING gin (ndc_original gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_original ON public.ndc_pricing_index USING btree (ndc_original);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_ndc_trgm ON public.ndc_pricing_index USING gin (ndc_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_product_trgm ON public.ndc_pricing_index USING gin (product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_report_date ON public.ndc_pricing_index USING btree (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_ndc_pricing_updated ON public.ndc_pricing_index USING btree (updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ndc_pricing_index_ndc_normalized_distributor_name_is_full_r_key ON public.ndc_pricing_index USING btree (ndc_normalized, distributor_name, is_full_record, is_partial_record);

-- Row Level Security
ALTER TABLE public."ndc_pricing_index" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."ndc_pricing_index";
CREATE POLICY "all policy"
    ON public."ndc_pricing_index"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ndc_pricing_index" ON public."ndc_pricing_index";
CREATE POLICY "service_role_all_ndc_pricing_index"
    ON public."ndc_pricing_index"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.ndc_products
-- ============================================================

DROP TABLE IF EXISTS public."ndc_products" CASCADE;

CREATE TABLE public."ndc_products" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "product_ndc" varchar(20) NOT NULL,
    "product_type_name" varchar(100),
    "proprietary_name" varchar(255),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ndc_products_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ndc_products_product_ndc ON public.ndc_products USING btree (product_ndc);
CREATE INDEX IF NOT EXISTS idx_ndc_products_proprietary_name ON public.ndc_products USING btree (proprietary_name);

-- Policies
DROP POLICY IF EXISTS "service_role_all_ndc_products" ON public."ndc_products";
CREATE POLICY "service_role_all_ndc_products"
    ON public."ndc_products"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.non_returnable_products
-- ============================================================

DROP TABLE IF EXISTS public."non_returnable_products" CASCADE;

CREATE TABLE public."non_returnable_products" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "manufacturer_policy_id" uuid NOT NULL,
    "ndc" varchar(13) NOT NULL,
    "product_name" text,
    "reason" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "non_returnable_products_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."non_returnable_products"
    ADD CONSTRAINT "non_returnable_products_manufacturer_policy_id_fkey" FOREIGN KEY (manufacturer_policy_id) REFERENCES manufacturer_policies(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nrp_ndc ON public.non_returnable_products USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_nrp_policy_id ON public.non_returnable_products USING btree (manufacturer_policy_id);

-- Row Level Security
ALTER TABLE public."non_returnable_products" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."non_returnable_products";
CREATE POLICY "all policy"
    ON public."non_returnable_products"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_non_returnable_products" ON public."non_returnable_products";
CREATE POLICY "service_role_all_non_returnable_products"
    ON public."non_returnable_products"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.notifications
-- ============================================================

DROP TABLE IF EXISTS public."notifications" CASCADE;

CREATE TABLE public."notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "read" boolean DEFAULT false,
    "action_url" text,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."notifications"
    ADD CONSTRAINT "notifications_type_check" CHECK (type::text = ANY (ARRAY['document_processed'::character varying::text, 'price_alert'::character varying::text, 'subscription'::character varying::text, 'system'::character varying::text, 'recommendation_ready'::character varying::text, 'credit_received'::character varying::text, 'shipment_update'::character varying::text, 'order_status'::character varying::text]));

ALTER TABLE public."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.orders
-- ============================================================

DROP TABLE IF EXISTS public."orders" CASCADE;

CREATE TABLE public."orders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "listing_id" uuid,
    "buyer_id" uuid NOT NULL,
    "seller_id" uuid NOT NULL,
    "drug_name" varchar(500),
    "quantity" integer NOT NULL,
    "total_amount" numeric NOT NULL,
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "tracking_number" varchar(100),
    "created_at" timestamptz DEFAULT now(),
    "confirmed_at" timestamptz,
    "shipped_at" timestamptz,
    "delivered_at" timestamptz,
    CONSTRAINT "orders_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'confirmed'::character varying::text, 'shipped'::character varying::text, 'delivered'::character varying::text, 'cancelled'::character varying::text]));

ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id);

ALTER TABLE public."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES pharmacy(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.payment_manufacturer_credits
-- ============================================================

DROP TABLE IF EXISTS public."payment_manufacturer_credits" CASCADE;

CREATE TABLE public."payment_manufacturer_credits" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "payment_id" uuid NOT NULL,
    "manufacturer_name" text NOT NULL,
    "credit_amount" numeric DEFAULT 0 NOT NULL,
    "credit_type" text NOT NULL,
    "is_controlled_substance" boolean DEFAULT false,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "payment_manufacturer_credits_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."payment_manufacturer_credits"
    ADD CONSTRAINT "payment_manufacturer_credits_credit_type_check" CHECK (credit_type = ANY (ARRAY['included'::text, 'direct'::text, 'por'::text]));

ALTER TABLE public."payment_manufacturer_credits"
    ADD CONSTRAINT "payment_manufacturer_credits_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES pharmacy_payments(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pmc_created_at ON public.payment_manufacturer_credits USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_pmc_credit_type ON public.payment_manufacturer_credits USING btree (credit_type);
CREATE INDEX IF NOT EXISTS idx_pmc_manufacturer ON public.payment_manufacturer_credits USING btree (manufacturer_name);
CREATE INDEX IF NOT EXISTS idx_pmc_payment_id ON public.payment_manufacturer_credits USING btree (payment_id);

-- Row Level Security
ALTER TABLE public."payment_manufacturer_credits" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."payment_manufacturer_credits";
CREATE POLICY "Allow all access via service role"
    ON public."payment_manufacturer_credits"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy" CASCADE;

CREATE TABLE public."pharmacy" (
    "id" uuid NOT NULL,
    "email" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "pharmacy_name" varchar(255) NOT NULL,
    "phone" varchar(20),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "npi_number" varchar(50),
    "dea_number" varchar(50),
    "status" varchar(20) DEFAULT 'pending'::character varying,
    "physical_address" jsonb,
    "billing_address" jsonb,
    "contact_phone" varchar(20),
    "subscription_tier" varchar(20) DEFAULT 'free'::character varying,
    "subscription_status" varchar(20) DEFAULT 'trial'::character varying,
    "state_license_number" varchar(100),
    "license_expiry_date" date,
    "trial_ends_at" timestamptz,
    "fcm_token" text,
    "store_number" varchar(10),
    "primary_wholesaler" text,
    "wholesaler_account_number" text,
    "secondary_wholesaler" text,
    "gpo_affiliation" text,
    "service_type" text DEFAULT 'full_service'::text,
    "assigned_processor_id" uuid,
    "assigned_sales_person_id" uuid,
    "last_visit_date" date,
    "next_visit_date" date,
    "days_between_visits" integer DEFAULT 120,
    "dea_expiration_date" date,
    "fax_number" text,
    "parent_pharmacy_id" uuid,
    "can_manage_branches" boolean DEFAULT false,
    "created_by" uuid,
    "corporate_name" text,
    "dea_file_url" text,
    "license_file_url" text,
    "mailing_address" text,
    "store_hours" text,
    CONSTRAINT "pharmacy_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_service_type_check" CHECK (service_type = ANY (ARRAY['full_service'::text, 'self_service'::text, 'express'::text]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'suspended'::character varying, 'blacklisted'::character varying]::text[]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_subscription_status_check" CHECK (subscription_status::text = ANY (ARRAY['active'::character varying, 'trial'::character varying, 'expired'::character varying, 'cancelled'::character varying, 'past_due'::character varying]::text[]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_subscription_tier_check" CHECK (subscription_tier::text = ANY (ARRAY['free'::character varying, 'basic'::character varying, 'premium'::character varying, 'enterprise'::character varying]::text[]));

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "fk_pharmacy_assigned_processor" FOREIGN KEY (assigned_processor_id) REFERENCES processors(id) ON DELETE SET NULL;

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_created_by_fkey" FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_parent_pharmacy_id_fkey" FOREIGN KEY (parent_pharmacy_id) REFERENCES pharmacy(id);

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_email_key" UNIQUE (email);

ALTER TABLE public."pharmacy"
    ADD CONSTRAINT "pharmacy_store_number_key" UNIQUE (store_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_assigned_processor ON public.pharmacy USING btree (assigned_processor_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_created_by ON public.pharmacy USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_pharmacy_email ON public.pharmacy USING btree (email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_fcm_token ON public.pharmacy USING btree (fcm_token) WHERE (fcm_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pharmacy_parent_id ON public.pharmacy USING btree (parent_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_store_number ON public.pharmacy USING btree (store_number);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_email_key ON public.pharmacy USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_store_number_key ON public.pharmacy USING btree (store_number);

-- Row Level Security
ALTER TABLE public."pharmacy" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow service role full access" ON public."pharmacy";
CREATE POLICY "Allow service role full access"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to delete own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to delete own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR DELETE TO 16481
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to insert own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR INSERT TO 16481
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to read own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to read own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update own pharmacy" ON public."pharmacy";
CREATE POLICY "Allow users to update own pharmacy"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR UPDATE TO 16481
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Pharmacies can update own record" ON public."pharmacy";
CREATE POLICY "Pharmacies can update own record"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR UPDATE TO public
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Pharmacies can view own record" ON public."pharmacy";
CREATE POLICY "Pharmacies can view own record"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR SELECT TO public
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role has full access" ON public."pharmacy";
CREATE POLICY "Service role has full access"
    ON public."pharmacy"
    AS PERMISSIVE
    FOR ALL TO public
    USING ((current_setting('request.jwt.claims'::text, true)::json ->> 'role'::text) = 'service_role'::text OR auth.uid() = id);


-- ============================================================
-- Table   : public.pharmacy_branch_invites
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_branch_invites" CASCADE;

CREATE TABLE public."pharmacy_branch_invites" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "parent_pharmacy_id" uuid NOT NULL,
    "invite_token" text NOT NULL,
    "email" text NOT NULL,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "completed_at" timestamptz,
    "pharmacy_name" text NOT NULL,
    "contact_name" text,
    "phone" text,
    "fax" text,
    "street" text,
    "city" text,
    "state" text,
    "zip" text,
    "wholesaler" text,
    "wholesaler_account" text,
    "secondary_wholesaler" text,
    "dea_number" text,
    "dea_expiration" date,
    "service_type" text DEFAULT 'full_service'::text,
    "days_between_visits" integer DEFAULT 120,
    "last_visit_date" date,
    "next_visit_date" date,
    "processor_id" uuid,
    "sales_person_id" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "pending_role_ids" uuid[],
    CONSTRAINT "pharmacy_branch_invites_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_branch_invites"
    ADD CONSTRAINT "pharmacy_branch_invites_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text]));

ALTER TABLE public."pharmacy_branch_invites"
    ADD CONSTRAINT "pharmacy_branch_invites_parent_pharmacy_id_fkey" FOREIGN KEY (parent_pharmacy_id) REFERENCES pharmacy(id);

ALTER TABLE public."pharmacy_branch_invites"
    ADD CONSTRAINT "pharmacy_branch_invites_invite_token_key" UNIQUE (invite_token);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branch_invites_email ON public.pharmacy_branch_invites USING btree (email);
CREATE INDEX IF NOT EXISTS idx_branch_invites_parent ON public.pharmacy_branch_invites USING btree (parent_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_branch_invites_status ON public.pharmacy_branch_invites USING btree (status);
CREATE INDEX IF NOT EXISTS idx_branch_invites_token ON public.pharmacy_branch_invites USING btree (invite_token);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_branch_invites_invite_token_key ON public.pharmacy_branch_invites USING btree (invite_token);

-- Row Level Security
ALTER TABLE public."pharmacy_branch_invites" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_branch_invites" ON public."pharmacy_branch_invites";
CREATE POLICY "Service role full access on pharmacy_branch_invites"
    ON public."pharmacy_branch_invites"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_branch_invites";
CREATE POLICY "all policy"
    ON public."pharmacy_branch_invites"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_branch_role_assignments
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_branch_role_assignments" CASCADE;

CREATE TABLE public."pharmacy_branch_role_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "branch_pharmacy_id" uuid NOT NULL,
    "role_id" uuid NOT NULL,
    "assigned_by" uuid NOT NULL,
    "assigned_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_branch_role_assignments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES pharmacy(id);

ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_branch_pharmacy_id_fkey" FOREIGN KEY (branch_pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES pharmacy_roles(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_branch_pharmacy_id_role_id_key" UNIQUE (branch_pharmacy_id, role_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branch_role_assign_branch ON public.pharmacy_branch_role_assignments USING btree (branch_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_branch_role_assign_role ON public.pharmacy_branch_role_assignments USING btree (role_id);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_branch_role_assignments_branch_pharmacy_id_role_id_key ON public.pharmacy_branch_role_assignments USING btree (branch_pharmacy_id, role_id);

-- Row Level Security
ALTER TABLE public."pharmacy_branch_role_assignments" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_branch_role_assignments" ON public."pharmacy_branch_role_assignments";
CREATE POLICY "Service role full access on pharmacy_branch_role_assignments"
    ON public."pharmacy_branch_role_assignments"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_branch_role_assignments";
CREATE POLICY "all policy"
    ON public."pharmacy_branch_role_assignments"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_cart
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_cart" CASCADE;

CREATE TABLE public."pharmacy_cart" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_cart_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_cart"
    ADD CONSTRAINT "pharmacy_cart_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_cart"
    ADD CONSTRAINT "unique_pharmacy_cart" UNIQUE (pharmacy_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_cart_pharmacy ON public.pharmacy_cart USING btree (pharmacy_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_pharmacy_cart ON public.pharmacy_cart USING btree (pharmacy_id);

-- Row Level Security
ALTER TABLE public."pharmacy_cart" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access pharmacy_cart" ON public."pharmacy_cart";
CREATE POLICY "Service role can access pharmacy_cart"
    ON public."pharmacy_cart"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_cart";
CREATE POLICY "all policy"
    ON public."pharmacy_cart"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_cart_items
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_cart_items" CASCADE;

CREATE TABLE public."pharmacy_cart_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "cart_id" uuid NOT NULL,
    "deal_id" uuid NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric NOT NULL,
    "original_price" numeric NOT NULL,
    "added_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_cart_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_original_price_check" CHECK (original_price > 0::numeric);

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_quantity_check" CHECK (quantity > 0);

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_unit_price_check" CHECK (unit_price > 0::numeric);

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_cart_id_fkey" FOREIGN KEY (cart_id) REFERENCES pharmacy_cart(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "pharmacy_cart_items_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES marketplace_deals(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_cart_items"
    ADD CONSTRAINT "unique_cart_deal" UNIQUE (cart_id, deal_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.pharmacy_cart_items USING btree (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_deal ON public.pharmacy_cart_items USING btree (deal_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_cart_deal ON public.pharmacy_cart_items USING btree (cart_id, deal_id);

-- Row Level Security
ALTER TABLE public."pharmacy_cart_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role can access pharmacy_cart_items" ON public."pharmacy_cart_items";
CREATE POLICY "Service role can access pharmacy_cart_items"
    ON public."pharmacy_cart_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_cart_items";
CREATE POLICY "all policy"
    ON public."pharmacy_cart_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_inventory_items
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_inventory_items" CASCADE;

CREATE TABLE public."pharmacy_inventory_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "upload_id" uuid NOT NULL,
    "ndc_code" varchar(20) NOT NULL,
    "ndc_normalized" varchar(20),
    "product_name" varchar(500),
    "manufacturer" varchar(500),
    "quantity" integer DEFAULT 1 NOT NULL,
    "full_units" integer DEFAULT 0,
    "partial_units" integer DEFAULT 0,
    "expiration_date" date,
    "lot_number" varchar(100),
    "acquisition_cost" numeric,
    "recommendation_type" varchar(20) DEFAULT 'pending'::character varying,
    "recommended_distributor_id" uuid,
    "recommended_distributor_name" varchar(500),
    "estimated_return_value" numeric DEFAULT 0,
    "best_full_price" numeric DEFAULT 0,
    "best_partial_price" numeric DEFAULT 0,
    "confidence_score" integer DEFAULT 0,
    "recommendation_reason" text,
    "status" varchar(20) DEFAULT 'active'::character varying,
    "returned_at" timestamptz,
    "returned_to_distributor_id" uuid,
    "actual_return_value" numeric,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_inventory_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_recommendation_type_check" CHECK (recommendation_type::text = ANY (ARRAY['return_now'::character varying, 'keep'::character varying, 'monitor'::character varying, 'pending'::character varying, 'no_data'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'returned'::character varying, 'expired'::character varying, 'dismissed'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_recommended_distributor_id_fkey" FOREIGN KEY (recommended_distributor_id) REFERENCES reverse_distributors(id);

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_returned_to_distributor_id_fkey" FOREIGN KEY (returned_to_distributor_id) REFERENCES reverse_distributors(id);

ALTER TABLE public."pharmacy_inventory_items"
    ADD CONSTRAINT "pharmacy_inventory_items_upload_id_fkey" FOREIGN KEY (upload_id) REFERENCES pharmacy_inventory_uploads(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_expiration_date ON public.pharmacy_inventory_items USING btree (expiration_date);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_ndc_normalized ON public.pharmacy_inventory_items USING btree (ndc_normalized);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_pharmacy_id ON public.pharmacy_inventory_items USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_recommendation_type ON public.pharmacy_inventory_items USING btree (recommendation_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_status ON public.pharmacy_inventory_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_items_upload_id ON public.pharmacy_inventory_items USING btree (upload_id);

-- Row Level Security
ALTER TABLE public."pharmacy_inventory_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Pharmacies can view own inventory items" ON public."pharmacy_inventory_items";
CREATE POLICY "Pharmacies can view own inventory items"
    ON public."pharmacy_inventory_items"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to inventory items" ON public."pharmacy_inventory_items";
CREATE POLICY "Service role full access to inventory items"
    ON public."pharmacy_inventory_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_inventory_items";
CREATE POLICY "all policy"
    ON public."pharmacy_inventory_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_inventory_uploads
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_inventory_uploads" CASCADE;

CREATE TABLE public."pharmacy_inventory_uploads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "file_name" varchar(500) NOT NULL,
    "file_type" varchar(50) NOT NULL,
    "file_size" bigint NOT NULL,
    "total_items" integer DEFAULT 0,
    "total_value" numeric DEFAULT 0,
    "items_to_return" integer DEFAULT 0,
    "items_to_keep" integer DEFAULT 0,
    "status" varchar(50) DEFAULT 'processing'::character varying,
    "error_message" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_inventory_uploads_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_inventory_uploads"
    ADD CONSTRAINT "pharmacy_inventory_uploads_file_type_check" CHECK (file_type::text = ANY (ARRAY['csv'::character varying, 'pdf'::character varying, 'txt'::character varying, 'xlsx'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_uploads"
    ADD CONSTRAINT "pharmacy_inventory_uploads_status_check" CHECK (status::text = ANY (ARRAY['processing'::character varying, 'completed'::character varying, 'failed'::character varying]::text[]));

ALTER TABLE public."pharmacy_inventory_uploads"
    ADD CONSTRAINT "pharmacy_inventory_uploads_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_created_at ON public.pharmacy_inventory_uploads USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_pharmacy_id ON public.pharmacy_inventory_uploads USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_uploads_status ON public.pharmacy_inventory_uploads USING btree (status);

-- Row Level Security
ALTER TABLE public."pharmacy_inventory_uploads" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Pharmacies can view own inventory uploads" ON public."pharmacy_inventory_uploads";
CREATE POLICY "Pharmacies can view own inventory uploads"
    ON public."pharmacy_inventory_uploads"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to inventory uploads" ON public."pharmacy_inventory_uploads";
CREATE POLICY "Service role full access to inventory uploads"
    ON public."pharmacy_inventory_uploads"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_inventory_uploads";
CREATE POLICY "all policy"
    ON public."pharmacy_inventory_uploads"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_invites
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_invites" CASCADE;

CREATE TABLE public."pharmacy_invites" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "invite_token" text NOT NULL,
    "email" text NOT NULL,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "completed_at" timestamptz,
    "created_by" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "pharmacy_name" text DEFAULT ''::text NOT NULL,
    "contact_name" text,
    "phone" text,
    "fax" text,
    "street" text,
    "city" text,
    "state" text,
    "zip" text,
    "wholesaler" text,
    "wholesaler_account" text,
    "dea_number" text,
    "dea_expiration" date,
    "service_type" text DEFAULT 'full_service'::text,
    "days_between_visits" integer DEFAULT 120,
    "last_visit_date" date,
    "next_visit_date" date,
    "processor_id" uuid,
    "sales_person_id" uuid,
    "secondary_wholesaler" text,
    CONSTRAINT "pharmacy_invites_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_invites"
    ADD CONSTRAINT "pharmacy_invites_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text]));

ALTER TABLE public."pharmacy_invites"
    ADD CONSTRAINT "pharmacy_invites_invite_token_key" UNIQUE (invite_token);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_email ON public.pharmacy_invites USING btree (email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_status ON public.pharmacy_invites USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invites_token ON public.pharmacy_invites USING btree (invite_token);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_invites_invite_token_key ON public.pharmacy_invites USING btree (invite_token);

-- Row Level Security
ALTER TABLE public."pharmacy_invites" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_invites" ON public."pharmacy_invites";
CREATE POLICY "Service role full access on pharmacy_invites"
    ON public."pharmacy_invites"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_invites";
CREATE POLICY "all policy"
    ON public."pharmacy_invites"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_notifications
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_notifications" CASCADE;

CREATE TABLE public."pharmacy_notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "ndc_code" varchar(20),
    "product_name" varchar(500),
    "expiration_date" date,
    "days_until_expiration" integer,
    "full_units" integer DEFAULT 0,
    "partial_units" integer DEFAULT 0,
    "full_price" numeric DEFAULT 0,
    "partial_price" numeric DEFAULT 0,
    "total_potential_value" numeric DEFAULT 0,
    "recommended_distributor_id" uuid,
    "recommended_distributor_name" varchar(500),
    "status" varchar(20) DEFAULT 'unread'::character varying,
    "read_at" timestamptz,
    "dismissed_at" timestamptz,
    "inventory_item_id" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "entity_id" uuid,
    "entity_type" text,
    "is_read" boolean DEFAULT false NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "type" text DEFAULT 'general'::text NOT NULL,
    CONSTRAINT "pharmacy_notifications_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_status_check" CHECK (status::text = ANY (ARRAY['unread'::character varying, 'read'::character varying, 'dismissed'::character varying, 'acted_on'::character varying]::text[]));

ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_inventory_item_id_fkey" FOREIGN KEY (inventory_item_id) REFERENCES pharmacy_inventory_items(id) ON DELETE SET NULL;

ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_notifications"
    ADD CONSTRAINT "pharmacy_notifications_recommended_distributor_id_fkey" FOREIGN KEY (recommended_distributor_id) REFERENCES reverse_distributors(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharm_notif_created_at ON public.pharmacy_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_entity ON public.pharmacy_notifications USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_pharmacy_id ON public.pharmacy_notifications USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_unread ON public.pharmacy_notifications USING btree (pharmacy_id, is_read) WHERE (is_read = false);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_created_at ON public.pharmacy_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_ndc ON public.pharmacy_notifications USING btree (ndc_code);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_pharmacy_id ON public.pharmacy_notifications USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_status ON public.pharmacy_notifications USING btree (status);

-- Row Level Security
ALTER TABLE public."pharmacy_notifications" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."pharmacy_notifications";
CREATE POLICY "all policy"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "pharmacy_notifications_select_policy" ON public."pharmacy_notifications";
CREATE POLICY "pharmacy_notifications_select_policy"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR SELECT TO 16481
    USING (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "pharmacy_notifications_service_policy" ON public."pharmacy_notifications";
CREATE POLICY "pharmacy_notifications_service_policy"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "pharmacy_notifications_service_role_all" ON public."pharmacy_notifications";
CREATE POLICY "pharmacy_notifications_service_role_all"
    ON public."pharmacy_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


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


-- ============================================================
-- Table   : public.pharmacy_permissions
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_permissions" CASCADE;

CREATE TABLE public."pharmacy_permissions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "permission_key" text NOT NULL,
    "module" text NOT NULL,
    "action" text NOT NULL,
    "display_name" text NOT NULL,
    "description" text,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_permissions_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_permissions"
    ADD CONSTRAINT "pharmacy_permissions_permission_key_key" UNIQUE (permission_key);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_permissions_permission_key_key ON public.pharmacy_permissions USING btree (permission_key);

-- Row Level Security
ALTER TABLE public."pharmacy_permissions" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_permissions" ON public."pharmacy_permissions";
CREATE POLICY "Service role full access on pharmacy_permissions"
    ON public."pharmacy_permissions"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_permissions";
CREATE POLICY "all policy"
    ON public."pharmacy_permissions"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_role_permissions
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_role_permissions" CASCADE;

CREATE TABLE public."pharmacy_role_permissions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "role_id" uuid NOT NULL,
    "permission_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_role_permissions_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_role_permissions"
    ADD CONSTRAINT "pharmacy_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES pharmacy_permissions(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_role_permissions"
    ADD CONSTRAINT "pharmacy_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES pharmacy_roles(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_role_permissions"
    ADD CONSTRAINT "pharmacy_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_role_perms_role ON public.pharmacy_role_permissions USING btree (role_id);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_role_permissions_role_id_permission_id_key ON public.pharmacy_role_permissions USING btree (role_id, permission_id);

-- Row Level Security
ALTER TABLE public."pharmacy_role_permissions" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_role_permissions" ON public."pharmacy_role_permissions";
CREATE POLICY "Service role full access on pharmacy_role_permissions"
    ON public."pharmacy_role_permissions"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_role_permissions";
CREATE POLICY "all policy"
    ON public."pharmacy_role_permissions"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pharmacy_roles
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_roles" CASCADE;

CREATE TABLE public."pharmacy_roles" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "parent_pharmacy_id" uuid NOT NULL,
    "role_name" text NOT NULL,
    "description" text,
    "is_default" boolean DEFAULT false,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_roles_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_roles"
    ADD CONSTRAINT "pharmacy_roles_parent_pharmacy_id_fkey" FOREIGN KEY (parent_pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_roles"
    ADD CONSTRAINT "pharmacy_roles_parent_pharmacy_id_role_name_key" UNIQUE (parent_pharmacy_id, role_name);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_roles_parent ON public.pharmacy_roles USING btree (parent_pharmacy_id);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_roles_parent_pharmacy_id_role_name_key ON public.pharmacy_roles USING btree (parent_pharmacy_id, role_name);

-- Row Level Security
ALTER TABLE public."pharmacy_roles" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_roles" ON public."pharmacy_roles";
CREATE POLICY "Service role full access on pharmacy_roles"
    ON public."pharmacy_roles"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_roles";
CREATE POLICY "all policy"
    ON public."pharmacy_roles"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.pricing_data
-- ============================================================

DROP TABLE IF EXISTS public."pricing_data" CASCADE;

CREATE TABLE public."pricing_data" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "reverse_distributor_id" uuid,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500),
    "manufacturer" varchar(255),
    "lot_number" varchar(100),
    "expiration_date" date,
    "quantity" integer,
    "credit_amount" numeric,
    "price_per_unit" numeric,
    "document_id" uuid,
    "payment_date" date,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "pricing_data_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pricing_data"
    ADD CONSTRAINT "pricing_data_document_id_fkey" FOREIGN KEY (document_id) REFERENCES uploaded_documents(id);

ALTER TABLE public."pricing_data"
    ADD CONSTRAINT "pricing_data_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pricing_data"
    ADD CONSTRAINT "pricing_data_reverse_distributor_id_fkey" FOREIGN KEY (reverse_distributor_id) REFERENCES reverse_distributors(id);


-- ============================================================
-- Table   : public.processed_inbox_emails
-- ============================================================

DROP TABLE IF EXISTS public."processed_inbox_emails" CASCADE;

CREATE TABLE public."processed_inbox_emails" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email_uid" text NOT NULL,
    "email_message_id" text,
    "from_address" text NOT NULL,
    "to_address" text,
    "subject" text,
    "received_at" timestamptz,
    "processed_at" timestamptz DEFAULT now() NOT NULL,
    "memo_number" text,
    "debit_memo_id" uuid,
    "extracted_ra_number" text,
    "ai_confidence" numeric DEFAULT 0,
    "ai_raw_response" jsonb DEFAULT '{}'::jsonb,
    "status" text DEFAULT 'processed'::text NOT NULL,
    "error_message" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "pdf_url" text,
    "ra_number" text,
    CONSTRAINT "processed_inbox_emails_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processed_inbox_emails"
    ADD CONSTRAINT "fk_processed_inbox_debit_memo" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processed_inbox_debit_memo ON public.processed_inbox_emails USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_email_uid ON public.processed_inbox_emails USING btree (email_uid);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_memo_number ON public.processed_inbox_emails USING btree (memo_number);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_processed ON public.processed_inbox_emails USING btree (processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_status ON public.processed_inbox_emails USING btree (status);

-- Policies
DROP POLICY IF EXISTS "Service role full access on processed_inbox_emails" ON public."processed_inbox_emails";
CREATE POLICY "Service role full access on processed_inbox_emails"
    ON public."processed_inbox_emails"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."processed_inbox_emails";
CREATE POLICY "all policy"
    ON public."processed_inbox_emails"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.processor_notifications
-- ============================================================

DROP TABLE IF EXISTS public."processor_notifications" CASCADE;

CREATE TABLE public."processor_notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "processor_id" uuid NOT NULL,
    "type" text NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "entity_type" text,
    "entity_id" uuid,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "processor_notifications_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processor_notifications"
    ADD CONSTRAINT "processor_notifications_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proc_notif_created_at ON public.processor_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proc_notif_entity ON public.processor_notifications USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_proc_notif_processor_id ON public.processor_notifications USING btree (processor_id);
CREATE INDEX IF NOT EXISTS idx_proc_notif_unread ON public.processor_notifications USING btree (processor_id, is_read) WHERE (is_read = false);

-- Row Level Security
ALTER TABLE public."processor_notifications" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."processor_notifications";
CREATE POLICY "all policy"
    ON public."processor_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "processor_notifications_service_role_all" ON public."processor_notifications";
CREATE POLICY "processor_notifications_service_role_all"
    ON public."processor_notifications"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.processor_store_assignments
-- ============================================================

DROP TABLE IF EXISTS public."processor_store_assignments" CASCADE;

CREATE TABLE public."processor_store_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "processor_id" uuid NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "assigned_date" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "processor_store_assignments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processor_store_assignments"
    ADD CONSTRAINT "processor_store_assignments_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."processor_store_assignments"
    ADD CONSTRAINT "processor_store_assignments_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE CASCADE;

ALTER TABLE public."processor_store_assignments"
    ADD CONSTRAINT "processor_store_assignments_processor_id_pharmacy_id_key" UNIQUE (processor_id, pharmacy_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_psa_pharmacy ON public.processor_store_assignments USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_psa_processor ON public.processor_store_assignments USING btree (processor_id);
CREATE UNIQUE INDEX IF NOT EXISTS processor_store_assignments_processor_id_pharmacy_id_key ON public.processor_store_assignments USING btree (processor_id, pharmacy_id);

-- Row Level Security
ALTER TABLE public."processor_store_assignments" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."processor_store_assignments";
CREATE POLICY "all policy"
    ON public."processor_store_assignments"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_processor_assignments" ON public."processor_store_assignments";
CREATE POLICY "service_role_all_processor_assignments"
    ON public."processor_store_assignments"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.processors
-- ============================================================

DROP TABLE IF EXISTS public."processors" CASCADE;

CREATE TABLE public."processors" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "email" text,
    "phone" text,
    "status" text DEFAULT 'active'::text NOT NULL,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "admin_user_id" uuid,
    "buying_group_id" uuid,
    CONSTRAINT "processors_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]));

ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_buying_group_id_fkey" FOREIGN KEY (buying_group_id) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."processors"
    ADD CONSTRAINT "processors_email_key" UNIQUE (email);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processors_admin_user_id ON public.processors USING btree (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_processors_buying_group_id ON public.processors USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_processors_email ON public.processors USING btree (email);
CREATE INDEX IF NOT EXISTS idx_processors_status ON public.processors USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS processors_email_key ON public.processors USING btree (email);

-- Row Level Security
ALTER TABLE public."processors" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."processors";
CREATE POLICY "all policy"
    ON public."processors"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_processors" ON public."processors";
CREATE POLICY "service_role_all_processors"
    ON public."processors"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.product_list_items
-- ============================================================

DROP TABLE IF EXISTS public."product_list_items" CASCADE;

CREATE TABLE public."product_list_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500),
    "lot_number" varchar(100),
    "expiration_date" date,
    "notes" text,
    "added_at" timestamptz DEFAULT now(),
    "added_by" uuid,
    "full_units" integer NOT NULL,
    "partial_units" integer NOT NULL,
    CONSTRAINT "product_list_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_full_units_check" CHECK (full_units >= 0);

ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_partial_units_check" CHECK (partial_units >= 0);

ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_units_check" CHECK (full_units = 0 AND partial_units > 0 OR full_units > 0 AND partial_units = 0);

ALTER TABLE public."product_list_items"
    ADD CONSTRAINT "product_list_items_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id);

-- Policies
DROP POLICY IF EXISTS "service_role_all_product_list_items" ON public."product_list_items";
CREATE POLICY "service_role_all_product_list_items"
    ON public."product_list_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.product_lists
-- ============================================================

DROP TABLE IF EXISTS public."product_lists" CASCADE;

CREATE TABLE public."product_lists" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "name" varchar(255) NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "product_lists_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."product_lists"
    ADD CONSTRAINT "product_lists_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.products
-- ============================================================

DROP TABLE IF EXISTS public."products" CASCADE;

CREATE TABLE public."products" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "ndc" varchar(50) NOT NULL,
    "product_name" varchar(500) NOT NULL,
    "manufacturer" varchar(255),
    "strength" varchar(100),
    "dosage_form" varchar(100),
    "package_size" integer,
    "wac" numeric,
    "awp" numeric,
    "dea_schedule" varchar(10),
    "return_eligibility" jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "products_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."products"
    ADD CONSTRAINT "products_ndc_key" UNIQUE (ndc);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_ndc ON public.products USING btree (ndc);
CREATE UNIQUE INDEX IF NOT EXISTS products_ndc_key ON public.products USING btree (ndc);

-- Policies
DROP POLICY IF EXISTS "service_role_all_products" ON public."products";
CREATE POLICY "service_role_all_products"
    ON public."products"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.ra_requests
-- ============================================================

DROP TABLE IF EXISTS public."ra_requests" CASCADE;

CREATE TABLE public."ra_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "debit_memo_id" uuid NOT NULL,
    "request_type" text DEFAULT 'initial'::text NOT NULL,
    "destination_email" text,
    "destination_name" text,
    "subject" text,
    "body_preview" text,
    "status" text DEFAULT 'sent'::text NOT NULL,
    "sent_by" text,
    "sent_at" timestamptz DEFAULT now() NOT NULL,
    "error_message" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "smtp_message_id" varchar(255),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "ra_requests_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."ra_requests"
    ADD CONSTRAINT "ra_requests_request_type_check" CHECK (request_type = ANY (ARRAY['initial'::text, 'reminder'::text, 'resend'::text]));

ALTER TABLE public."ra_requests"
    ADD CONSTRAINT "ra_requests_status_check" CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text, 'bounced'::text]));

ALTER TABLE public."ra_requests"
    ADD CONSTRAINT "ra_requests_debit_memo_id_fkey" FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ra_requests_smtp_message_id ON public.ra_requests USING btree (smtp_message_id);
CREATE INDEX IF NOT EXISTS idx_rar_debit_memo ON public.ra_requests USING btree (debit_memo_id);
CREATE INDEX IF NOT EXISTS idx_rar_sent_at ON public.ra_requests USING btree (sent_at);
CREATE INDEX IF NOT EXISTS idx_rar_status ON public.ra_requests USING btree (status);

-- Row Level Security
ALTER TABLE public."ra_requests" ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Table   : public.refresh_tokens
-- ============================================================

DROP TABLE IF EXISTS public."refresh_tokens" CASCADE;

CREATE TABLE public."refresh_tokens" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "token_hash" text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "last_used_at" timestamptz,
    "revoked_at" timestamptz,
    "user_agent" text,
    "ip_address" inet,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE (token_hash);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_pharmacy_id ON public.refresh_tokens USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);

-- Row Level Security
ALTER TABLE public."refresh_tokens" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."refresh_tokens";
CREATE POLICY "all policy"
    ON public."refresh_tokens"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "pharmacy_own_refresh_tokens" ON public."refresh_tokens";
CREATE POLICY "pharmacy_own_refresh_tokens"
    ON public."refresh_tokens"
    AS PERMISSIVE
    FOR ALL TO 16481
    USING (pharmacy_id = auth.uid())
    WITH CHECK (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public."refresh_tokens";
CREATE POLICY "service_role_all_refresh_tokens"
    ON public."refresh_tokens"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.return_batches
-- ============================================================

DROP TABLE IF EXISTS public."return_batches" CASCADE;

CREATE TABLE public."return_batches" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "batch_month" date NOT NULL,
    "batch_name" text NOT NULL,
    "status" text DEFAULT 'open'::text NOT NULL,
    "total_returns" integer DEFAULT 0 NOT NULL,
    "total_debit_memos" integer DEFAULT 0 NOT NULL,
    "total_value" numeric DEFAULT 0 NOT NULL,
    "cardinal_file_generated" boolean DEFAULT false NOT NULL,
    "cardinal_file_url" text,
    "cardinal_submitted_at" timestamptz,
    "cardinal_approved_at" timestamptz,
    "closed_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "return_batches_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_batches"
    ADD CONSTRAINT "return_batches_status_check" CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'submitted'::text]));

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_rb_batch_month ON public.return_batches USING btree (batch_month);
CREATE INDEX IF NOT EXISTS idx_rb_status ON public.return_batches USING btree (status);

-- Row Level Security
ALTER TABLE public."return_batches" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."return_batches";
CREATE POLICY "all policy"
    ON public."return_batches"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_return_batches" ON public."return_batches";
CREATE POLICY "service_role_all_return_batches"
    ON public."return_batches"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.return_items
-- ============================================================

DROP TABLE IF EXISTS public."return_items" CASCADE;

CREATE TABLE public."return_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "return_id" uuid NOT NULL,
    "inventory_item_id" uuid,
    "ndc" varchar(50) NOT NULL,
    "drug_name" varchar(500) NOT NULL,
    "manufacturer" varchar(255),
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "reason" text,
    "estimated_credit" numeric,
    "classification" varchar(50),
    "photos" text[],
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "return_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_items"
    ADD CONSTRAINT "return_items_classification_check" CHECK (classification::text = ANY (ARRAY['returnable'::character varying::text, 'destruction'::character varying::text, 'pending'::character varying::text]));

ALTER TABLE public."return_items"
    ADD CONSTRAINT "return_items_inventory_item_id_fkey" FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

ALTER TABLE public."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.return_reports
-- ============================================================

DROP TABLE IF EXISTS public."return_reports" CASCADE;

CREATE TABLE public."return_reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "document_id" uuid NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "data" jsonb NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "return_reports_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_reports"
    ADD CONSTRAINT "return_reports_document_id_fkey" FOREIGN KEY (document_id) REFERENCES uploaded_documents(id) ON DELETE CASCADE;

ALTER TABLE public."return_reports"
    ADD CONSTRAINT "return_reports_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_return_reports_created_at ON public.return_reports USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_return_reports_data_gin ON public.return_reports USING gin (data);
CREATE INDEX IF NOT EXISTS idx_return_reports_document_id ON public.return_reports USING btree (document_id);
CREATE INDEX IF NOT EXISTS idx_return_reports_pharmacy_id ON public.return_reports USING btree (pharmacy_id);

-- Policies
DROP POLICY IF EXISTS "service_role_all_return_reports" ON public."return_reports";
CREATE POLICY "service_role_all_return_reports"
    ON public."return_reports"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.return_transaction_items
-- ============================================================

DROP TABLE IF EXISTS public."return_transaction_items" CASCADE;

CREATE TABLE public."return_transaction_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "transaction_id" uuid NOT NULL,
    "ndc" varchar(13),
    "ndc_10" varchar(12),
    "gtin" varchar(14),
    "proprietary_name" text,
    "generic_name" text,
    "manufacturer" text,
    "package_description" text,
    "dosage_form" text,
    "strength" text,
    "route" text,
    "lot_number" text,
    "serial_number" text,
    "expiration_date" date,
    "standard_price" numeric,
    "quantity" integer DEFAULT 1 NOT NULL,
    "full_package_size" integer,
    "is_partial" boolean DEFAULT false,
    "partial_percentage" numeric,
    "estimated_value" numeric,
    "return_status" text DEFAULT 'tbd'::text NOT NULL,
    "non_returnable_reason" text,
    "return_reason" text,
    "destination" text,
    "dea_schedule" text,
    "dea_form_222_required" boolean DEFAULT false,
    "product_type" text,
    "co_status" text DEFAULT 'no'::text,
    "bmp_status" text DEFAULT 'no'::text,
    "memo" text,
    "wine_cellar_id" uuid,
    "scan_source" text DEFAULT 'manual'::text,
    "raw_scan_data" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "verified" boolean DEFAULT false,
    "actual_quantity" integer,
    "condition_notes" text,
    "estimated_store_price" numeric,
    "estimated_store_value" numeric,
    "full_package_qty_returned" integer,
    "quantity_returned" integer,
    "verification_status" text,
    CONSTRAINT "return_transaction_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_bmp_status_check" CHECK (bmp_status = ANY (ARRAY['yes'::text, 'no'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_co_status_check" CHECK (co_status = ANY (ARRAY['yes'::text, 'no'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_non_returnable_reason_check" CHECK (non_returnable_reason IS NULL OR (non_returnable_reason = ANY (ARRAY['manufacturer_no_returns'::text, 'sold_non_returnable'::text, 'manufacturer_no_partials'::text, 'repackaged'::text, 'too_far_past_expiration'::text, 'minimum_quantity_not_met'::text, 'sample'::text, 'rx_label_on_product'::text, 'label_defaced_or_damaged'::text, 'lot_non_returnable'::text, 'minimum_value_not_met'::text, 'other'::text, 'free_complimentary'::text, 'not_in_original_package'::text, 'overfilled_container'::text, 'too_far_in_date'::text, 'destroy_at_customer_request'::text, 'compounded'::text, 'date'::text, 'policy'::text, 'no_data'::text, 'manual'::text])));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_return_status_check" CHECK (return_status = ANY (ARRAY['returnable'::text, 'non_returnable'::text, 'tbd'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_scan_source_check" CHECK (scan_source = ANY (ARRAY['gs1_qr'::text, 'barcode_1d'::text, 'manual'::text, 'ai_parsed'::text]));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_verification_status_check" CHECK (verification_status IS NULL OR (verification_status = ANY (ARRAY['correct'::text, 'damaged'::text, 'missing'::text, 'wrong_item'::text])));

ALTER TABLE public."return_transaction_items"
    ADD CONSTRAINT "return_transaction_items_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rti_expiration ON public.return_transaction_items USING btree (expiration_date);
CREATE INDEX IF NOT EXISTS idx_rti_gtin ON public.return_transaction_items USING btree (gtin);
CREATE INDEX IF NOT EXISTS idx_rti_lot ON public.return_transaction_items USING btree (lot_number);
CREATE INDEX IF NOT EXISTS idx_rti_ndc ON public.return_transaction_items USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_rti_ndc_10 ON public.return_transaction_items USING btree (ndc_10);
CREATE INDEX IF NOT EXISTS idx_rti_status ON public.return_transaction_items USING btree (return_status);
CREATE INDEX IF NOT EXISTS idx_rti_transaction ON public.return_transaction_items USING btree (transaction_id);

-- Row Level Security
ALTER TABLE public."return_transaction_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."return_transaction_items";
CREATE POLICY "Allow all access via service role"
    ON public."return_transaction_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."return_transaction_items";
CREATE POLICY "all policy"
    ON public."return_transaction_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_return_transaction_items" ON public."return_transaction_items";
CREATE POLICY "service_role_all_return_transaction_items"
    ON public."return_transaction_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.return_transactions
-- ============================================================

DROP TABLE IF EXISTS public."return_transactions" CASCADE;

CREATE TABLE public."return_transactions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "license_plate" varchar(25) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "processor_id" uuid,
    "service_type" text DEFAULT 'in_store'::text NOT NULL,
    "status" text DEFAULT 'in_progress'::text NOT NULL,
    "fedex_tracking" text,
    "fedex_pickup_confirmation" text,
    "total_items" integer DEFAULT 0 NOT NULL,
    "total_returnable_value" numeric DEFAULT 0 NOT NULL,
    "total_non_returnable_value" numeric DEFAULT 0 NOT NULL,
    "batch_id" uuid,
    "time_in" timestamptz,
    "time_out" timestamptz,
    "received_in_warehouse_date" timestamptz,
    "finalized_at" timestamptz,
    "verified_integrity" boolean DEFAULT false,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "box_count" integer,
    "manifest_generated_at" timestamptz,
    "verified_at" timestamptz,
    "verified_by" uuid,
    "pieces_received" integer,
    "prp_number" text,
    "package_tracking" jsonb,
    "fedex_shipment_id" text,
    "fedex_labels" jsonb,
    "scanned_packages" jsonb,
    "finalize_steps" jsonb DEFAULT '{"fedexEntered": false, "printManifest": false, "printJobSheets": false}'::jsonb,
    "verification_completed_at" timestamptz,
    CONSTRAINT "return_transactions_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_service_type_check" CHECK (service_type = ANY (ARRAY['in_store'::text, 'self_service'::text, 'express'::text]));

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_status_check" CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'finalized'::text, 'scanning'::text, 'received'::text, 'verified'::text, 'closed'::text]));

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE SET NULL;

ALTER TABLE public."return_transactions"
    ADD CONSTRAINT "return_transactions_license_plate_key" UNIQUE (license_plate);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rt_batch ON public.return_transactions USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_rt_created_at ON public.return_transactions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rt_license_plate ON public.return_transactions USING btree (license_plate);
CREATE INDEX IF NOT EXISTS idx_rt_pharmacy ON public.return_transactions USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_rt_processor ON public.return_transactions USING btree (processor_id);
CREATE INDEX IF NOT EXISTS idx_rt_status ON public.return_transactions USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS return_transactions_license_plate_key ON public.return_transactions USING btree (license_plate);

-- Row Level Security
ALTER TABLE public."return_transactions" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."return_transactions";
CREATE POLICY "all policy"
    ON public."return_transactions"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_return_transactions" ON public."return_transactions";
CREATE POLICY "service_role_all_return_transactions"
    ON public."return_transactions"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.returns
-- ============================================================

DROP TABLE IF EXISTS public."returns" CASCADE;

CREATE TABLE public."returns" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(50) DEFAULT 'draft'::character varying,
    "total_estimated_credit" numeric DEFAULT 0,
    "shipment_id" uuid,
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "returns_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."returns"
    ADD CONSTRAINT "returns_status_check" CHECK (status::text = ANY (ARRAY['draft'::character varying::text, 'ready_to_ship'::character varying::text, 'in_transit'::character varying::text, 'processing'::character varying::text, 'completed'::character varying::text, 'cancelled'::character varying::text]));

ALTER TABLE public."returns"
    ADD CONSTRAINT "returns_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.reverse_distributors
-- ============================================================

DROP TABLE IF EXISTS public."reverse_distributors" CASCADE;

CREATE TABLE public."reverse_distributors" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "code" varchar(50) NOT NULL,
    "contact_email" varchar(255),
    "contact_phone" varchar(20),
    "address" jsonb,
    "portal_url" text,
    "supported_formats" text[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "fee_rates" jsonb,
    "contact_person" text,
    "license_number" text,
    "specializations" text[] DEFAULT ARRAY[]::text[],
    CONSTRAINT "reverse_distributors_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."reverse_distributors"
    ADD CONSTRAINT "reverse_distributors_code_key" UNIQUE (code);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_active ON public.reverse_distributors USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_code ON public.reverse_distributors USING btree (code);
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_name ON public.reverse_distributors USING btree (name);
CREATE UNIQUE INDEX IF NOT EXISTS reverse_distributors_code_key ON public.reverse_distributors USING btree (code);

-- Policies
DROP POLICY IF EXISTS "service_role_all_reverse_distributors" ON public."reverse_distributors";
CREATE POLICY "service_role_all_reverse_distributors"
    ON public."reverse_distributors"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.service_request_assignments
-- ============================================================

DROP TABLE IF EXISTS public."service_request_assignments" CASCADE;

CREATE TABLE public."service_request_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "service_request_id" uuid NOT NULL,
    "processor_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "service_request_assignments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."service_request_assignments"
    ADD CONSTRAINT "service_request_assignments_processor_id_fkey" FOREIGN KEY (processor_id) REFERENCES processors(id) ON DELETE CASCADE;

ALTER TABLE public."service_request_assignments"
    ADD CONSTRAINT "service_request_assignments_service_request_id_fkey" FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE;

ALTER TABLE public."service_request_assignments"
    ADD CONSTRAINT "service_request_assignments_service_request_id_processor_id_key" UNIQUE (service_request_id, processor_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sra_processor_id ON public.service_request_assignments USING btree (processor_id);
CREATE INDEX IF NOT EXISTS idx_sra_service_request_id ON public.service_request_assignments USING btree (service_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS service_request_assignments_service_request_id_processor_id_key ON public.service_request_assignments USING btree (service_request_id, processor_id);

-- Row Level Security
ALTER TABLE public."service_request_assignments" ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Table   : public.service_requests
-- ============================================================

DROP TABLE IF EXISTS public."service_requests" CASCADE;

CREATE TABLE public."service_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "branch_id" uuid,
    "requested_by_user_id" uuid,
    "buying_group_id" uuid,
    "requested_date" date NOT NULL,
    "purpose" text,
    "special_instructions" text,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "scheduled_date" date,
    "claimed_by_processor_id" uuid,
    "claimed_at" timestamptz,
    "scheduler_notes" text,
    "completed_at" timestamptz,
    "completion_notes" text,
    "cancelled_at" timestamptz,
    "cancelled_reason" text,
    "cancelled_by" text,
    "cancelled_by_id" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "service_requests_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_cancelled_by_check" CHECK (cancelled_by = ANY (ARRAY['pharmacy'::text, 'processor'::text, 'admin'::text]));

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_purpose_check" CHECK (purpose IS NULL OR (purpose = ANY (ARRAY['return_pickup'::text, 'training'::text, 'inventory_review'::text, 'destruction_pickup'::text, 'other'::text])));

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text]));

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES pharmacy(id) ON DELETE SET NULL;

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_claimed_by_processor_id_fkey" FOREIGN KEY (claimed_by_processor_id) REFERENCES processors(id) ON DELETE SET NULL;

ALTER TABLE public."service_requests"
    ADD CONSTRAINT "service_requests_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_branch_id ON public.service_requests USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_buying_group ON public.service_requests USING btree (buying_group_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_claimed_by ON public.service_requests USING btree (claimed_by_processor_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_pharmacy_id ON public.service_requests USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests USING btree (status);

-- Row Level Security
ALTER TABLE public."service_requests" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."service_requests";
CREATE POLICY "Allow all access via service role"
    ON public."service_requests"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true);

DROP POLICY IF EXISTS "service_role_all" ON public."service_requests";
CREATE POLICY "service_role_all"
    ON public."service_requests"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.shipment_groups
-- ============================================================

DROP TABLE IF EXISTS public."shipment_groups" CASCADE;

CREATE TABLE public."shipment_groups" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "destination" text NOT NULL,
    "outbound_tracking" text,
    "shipped_at" timestamptz,
    "box_count" integer DEFAULT 1,
    "total_memos" integer DEFAULT 0,
    "fedex_shipment_id" text,
    "fedex_labels" jsonb,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "shipment_groups_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sg_created_at ON public.shipment_groups USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_sg_destination ON public.shipment_groups USING btree (destination);
CREATE INDEX IF NOT EXISTS idx_sg_shipped_at ON public.shipment_groups USING btree (shipped_at);

-- Row Level Security
ALTER TABLE public."shipment_groups" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."shipment_groups";
CREATE POLICY "all policy"
    ON public."shipment_groups"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_shipment_groups" ON public."shipment_groups";
CREATE POLICY "service_role_all_shipment_groups"
    ON public."shipment_groups"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.shipments
-- ============================================================

DROP TABLE IF EXISTS public."shipments" CASCADE;

CREATE TABLE public."shipments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "return_id" uuid,
    "tracking_number" varchar(100),
    "carrier" varchar(50),
    "service_level" varchar(100),
    "status" varchar(50) DEFAULT 'label_created'::character varying,
    "estimated_delivery" timestamptz,
    "actual_delivery" timestamptz,
    "events" jsonb[],
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "shipments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_carrier_check" CHECK (carrier::text = ANY (ARRAY['UPS'::character varying::text, 'FedEx'::character varying::text, 'USPS'::character varying::text]));

ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_status_check" CHECK (status::text = ANY (ARRAY['label_created'::character varying::text, 'picked_up'::character varying::text, 'in_transit'::character varying::text, 'delivered'::character varying::text, 'exception'::character varying::text]));

ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_return_id_fkey" FOREIGN KEY (return_id) REFERENCES returns(id);

ALTER TABLE public."shipments"
    ADD CONSTRAINT "shipments_tracking_number_key" UNIQUE (tracking_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS shipments_tracking_number_key ON public.shipments USING btree (tracking_number);


-- ============================================================
-- Table   : public.sub_main_admin
-- ============================================================

DROP TABLE IF EXISTS public."sub_main_admin" CASCADE;

CREATE TABLE public."sub_main_admin" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" text,
    "name" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'sub_admin'::character varying NOT NULL,
    "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "is_active" boolean DEFAULT true,
    "invite_token" text,
    "invite_expires_at" timestamptz,
    "invite_accepted_at" timestamptz,
    "created_by" uuid,
    "last_login_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "sub_main_admin_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_role_check" CHECK (role::text = ANY (ARRAY['main_admin'::character varying, 'sub_admin'::character varying]::text[]));

ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_created_by_fkey" FOREIGN KEY (created_by) REFERENCES main_admin(id) ON DELETE SET NULL;

ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_email_key" UNIQUE (email);

ALTER TABLE public."sub_main_admin"
    ADD CONSTRAINT "sub_main_admin_invite_token_key" UNIQUE (invite_token);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_created_by ON public.sub_main_admin USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_email ON public.sub_main_admin USING btree (email);
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_invite_token ON public.sub_main_admin USING btree (invite_token);
CREATE INDEX IF NOT EXISTS idx_sub_main_admin_is_active ON public.sub_main_admin USING btree (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS sub_main_admin_email_key ON public.sub_main_admin USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS sub_main_admin_invite_token_key ON public.sub_main_admin USING btree (invite_token);

-- Row Level Security
ALTER TABLE public."sub_main_admin" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."sub_main_admin";
CREATE POLICY "all policy"
    ON public."sub_main_admin"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_sub_main_admin" ON public."sub_main_admin";
CREATE POLICY "service_role_all_sub_main_admin"
    ON public."sub_main_admin"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


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


-- ============================================================
-- Table   : public.uploaded_documents
-- ============================================================

DROP TABLE IF EXISTS public."uploaded_documents" CASCADE;

CREATE TABLE public."uploaded_documents" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "file_name" varchar(500) NOT NULL,
    "file_size" bigint NOT NULL,
    "file_type" varchar(100),
    "file_url" text,
    "reverse_distributor_id" uuid,
    "source" varchar(50) DEFAULT 'manual_upload'::character varying,
    "status" varchar(50) DEFAULT 'uploading'::character varying,
    "uploaded_at" timestamptz DEFAULT now(),
    "processed_at" timestamptz,
    "error_message" text,
    "extracted_items" integer DEFAULT 0,
    "total_credit_amount" numeric,
    "processing_progress" integer DEFAULT 0,
    "report_date" date,
    CONSTRAINT "uploaded_documents_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_source_check" CHECK (source::text = ANY (ARRAY['manual_upload'::character varying, 'email_forward'::character varying, 'portal_fetch'::character varying, 'api'::character varying]::text[]));

ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_status_check" CHECK (status::text = ANY (ARRAY['uploading'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'needs_review'::character varying]::text[]));

ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."uploaded_documents"
    ADD CONSTRAINT "uploaded_documents_reverse_distributor_id_fkey" FOREIGN KEY (reverse_distributor_id) REFERENCES reverse_distributors(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_pharmacy_id ON public.uploaded_documents USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_report_date ON public.uploaded_documents USING btree (report_date);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_reverse_distributor_id ON public.uploaded_documents USING btree (reverse_distributor_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status ON public.uploaded_documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_uploaded_at ON public.uploaded_documents USING btree (uploaded_at);

-- Policies
DROP POLICY IF EXISTS "service_role_all_uploaded_documents" ON public."uploaded_documents";
CREATE POLICY "service_role_all_uploaded_documents"
    ON public."uploaded_documents"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.v_stats
-- ============================================================

DROP TABLE IF EXISTS public."v_stats" CASCADE;

CREATE TABLE public."v_stats" (
    "jsonb_build_object" jsonb
);


-- ============================================================
-- Table   : public.warehouse_discrepancies
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_discrepancies" CASCADE;

CREATE TABLE public."warehouse_discrepancies" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "transaction_id" uuid NOT NULL,
    "item_id" uuid,
    "type" text NOT NULL,
    "ndc" text,
    "product_name" text,
    "expected_quantity" integer,
    "actual_quantity" integer,
    "notes" text,
    "status" text DEFAULT 'open'::text,
    "resolved_by" uuid,
    "resolved_at" timestamptz,
    "resolution_notes" text,
    "reported_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "resolution" text,
    CONSTRAINT "warehouse_discrepancies_pkey" PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_discrepancies_reported_by ON public.warehouse_discrepancies USING btree (reported_by);

-- Row Level Security
ALTER TABLE public."warehouse_discrepancies" ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Table   : public.warehouse_order_packages
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_order_packages" CASCADE;

CREATE TABLE public."warehouse_order_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "warehouse_order_id" uuid NOT NULL,
    "package_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_order_packages_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_order_packages"
    ADD CONSTRAINT "warehouse_order_packages_package_id_fkey" FOREIGN KEY (package_id) REFERENCES warehouse_packages(id) ON DELETE CASCADE;

ALTER TABLE public."warehouse_order_packages"
    ADD CONSTRAINT "warehouse_order_packages_warehouse_order_id_fkey" FOREIGN KEY (warehouse_order_id) REFERENCES warehouse_orders(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.warehouse_orders
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_orders" CASCADE;

CREATE TABLE public."warehouse_orders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_number" varchar(100) NOT NULL,
    "package_id" uuid,
    "return_id" uuid,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "total_items" integer DEFAULT 0,
    "refundable_items" integer DEFAULT 0,
    "non_refundable_items" integer DEFAULT 0,
    "total_estimated_credit" numeric DEFAULT 0,
    "actual_credit" numeric,
    "variance" numeric,
    "received_by" uuid,
    "inspected_by" uuid,
    "processed_by" uuid,
    "notes" text,
    "received_at" timestamptz,
    "completed_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_orders_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'received'::character varying::text, 'inspecting'::character varying::text, 'classifying'::character varying::text, 'processing'::character varying::text, 'completed'::character varying::text, 'exception'::character varying::text]));

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_inspected_by_fkey" FOREIGN KEY (inspected_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_package_id_fkey" FOREIGN KEY (package_id) REFERENCES warehouse_packages(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_processed_by_fkey" FOREIGN KEY (processed_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_received_by_fkey" FOREIGN KEY (received_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_return_id_fkey" FOREIGN KEY (return_id) REFERENCES returns(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_order_number_key" UNIQUE (order_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_orders_order_number_key ON public.warehouse_orders USING btree (order_number);


-- ============================================================
-- Table   : public.warehouse_package_items
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_package_items" CASCADE;

CREATE TABLE public."warehouse_package_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_id" uuid NOT NULL,
    "inventory_item_id" uuid,
    "ndc" varchar(50) NOT NULL,
    "drug_name" varchar(500) NOT NULL,
    "manufacturer" varchar(255),
    "lot_number" varchar(100) NOT NULL,
    "expiration_date" date NOT NULL,
    "quantity" integer NOT NULL,
    "unit" varchar(50),
    "reason" varchar(100),
    "estimated_credit" numeric,
    "classification" varchar(50),
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_package_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_classification_check" CHECK (classification::text = ANY (ARRAY['returnable'::character varying::text, 'destruction'::character varying::text, 'pending'::character varying::text]));

ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_reason_check" CHECK (reason::text = ANY (ARRAY['expired'::character varying::text, 'expiring_soon'::character varying::text, 'damaged'::character varying::text, 'recalled'::character varying::text, 'other'::character varying::text]));

ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_inventory_item_id_fkey" FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

ALTER TABLE public."warehouse_package_items"
    ADD CONSTRAINT "warehouse_package_items_package_id_fkey" FOREIGN KEY (package_id) REFERENCES warehouse_packages(id) ON DELETE CASCADE;


-- ============================================================
-- Table   : public.warehouse_packages
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_packages" CASCADE;

CREATE TABLE public."warehouse_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "package_number" varchar(100) NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(50) DEFAULT 'draft'::character varying,
    "total_items" integer DEFAULT 0,
    "total_estimated_value" numeric DEFAULT 0,
    "shipment_id" uuid,
    "tracking_number" varchar(100),
    "carrier" varchar(50),
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_packages_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_carrier_check" CHECK (carrier::text = ANY (ARRAY['UPS'::character varying::text, 'FedEx'::character varying::text, 'USPS'::character varying::text]));

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_status_check" CHECK (status::text = ANY (ARRAY['draft'::character varying::text, 'ready_to_ship'::character varying::text, 'in_transit'::character varying::text, 'received'::character varying::text, 'inspected'::character varying::text, 'processed'::character varying::text, 'completed'::character varying::text]));

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES shipments(id);

ALTER TABLE public."warehouse_packages"
    ADD CONSTRAINT "warehouse_packages_package_number_key" UNIQUE (package_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_packages_package_number_key ON public.warehouse_packages USING btree (package_number);


-- ============================================================
-- Table   : public.warehouse_surplus_items
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_surplus_items" CASCADE;

CREATE TABLE public."warehouse_surplus_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "transaction_id" uuid NOT NULL,
    "ndc" varchar(13),
    "product_name" text,
    "manufacturer" text,
    "lot_number" text,
    "expiration_date" date,
    "quantity" integer DEFAULT 1 NOT NULL,
    "warehouse_location" text NOT NULL,
    "condition" text DEFAULT 'good'::text,
    "notes" text,
    "status" text DEFAULT 'stored'::text NOT NULL,
    "assigned_return_id" uuid,
    "reported_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "warehouse_surplus_items_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_condition_check" CHECK (condition = ANY (ARRAY['good'::text, 'damaged'::text, 'unknown'::text]));

ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_status_check" CHECK (status = ANY (ARRAY['stored'::text, 'assigned_to_return'::text, 'disposed'::text, 'other'::text]));

ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_assigned_return_id_fkey" FOREIGN KEY (assigned_return_id) REFERENCES return_transactions(id) ON DELETE SET NULL;

ALTER TABLE public."warehouse_surplus_items"
    ADD CONSTRAINT "warehouse_surplus_items_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES return_transactions(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_surplus_items_transaction_id ON public.warehouse_surplus_items USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS idx_wsi_status ON public.warehouse_surplus_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_wsi_transaction ON public.warehouse_surplus_items USING btree (transaction_id);

-- Row Level Security
ALTER TABLE public."warehouse_surplus_items" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."warehouse_surplus_items";
CREATE POLICY "all policy"
    ON public."warehouse_surplus_items"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_warehouse_surplus_items" ON public."warehouse_surplus_items";
CREATE POLICY "service_role_all_warehouse_surplus_items"
    ON public."warehouse_surplus_items"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.warehouses
-- ============================================================

DROP TABLE IF EXISTS public."warehouses" CASCADE;

CREATE TABLE public."warehouses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "contact_name" varchar(255),
    "phone" varchar(50),
    "street" text,
    "city" varchar(100),
    "state" varchar(10),
    "zip" varchar(20),
    "country" varchar(10) DEFAULT 'US'::character varying,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "created_by" uuid,
    "updated_by" uuid,
    CONSTRAINT "warehouses_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouses"
    ADD CONSTRAINT "warehouses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL;

ALTER TABLE public."warehouses"
    ADD CONSTRAINT "warehouses_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES admin(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON public.warehouses USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_created_at ON public.warehouses USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_unique_default ON public.warehouses USING btree (is_default) WHERE (is_default = true);

-- Row Level Security
ALTER TABLE public."warehouses" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "MainAdmin can access warehouses" ON public."warehouses";
CREATE POLICY "MainAdmin can access warehouses"
    ON public."warehouses"
    AS PERMISSIVE
    FOR ALL TO 16481
    USING ((EXISTS ( SELECT 1
   FROM admin
  WHERE admin.id = auth.uid() AND (admin.role::text = 'main_admin'::text OR admin.email::text ~~ '%@pharmadmin.com'::text))));

DROP POLICY IF EXISTS "Service role can access warehouses" ON public."warehouses";
CREATE POLICY "Service role can access warehouses"
    ON public."warehouses"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."warehouses";
CREATE POLICY "all policy"
    ON public."warehouses"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- Table   : public.wine_cellar
-- ============================================================

DROP TABLE IF EXISTS public."wine_cellar" CASCADE;

CREATE TABLE public."wine_cellar" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "transaction_item_id" uuid,
    "ndc" varchar(13),
    "ndc_10" varchar(12),
    "product_name" text,
    "manufacturer" text,
    "lot_number" text,
    "serial_number" text,
    "expiration_date" date,
    "quantity" integer DEFAULT 1 NOT NULL,
    "standard_price" numeric,
    "estimated_value" numeric,
    "is_partial" boolean DEFAULT false,
    "partial_percentage" numeric,
    "date_shelved" timestamptz DEFAULT now() NOT NULL,
    "expected_returnable_date" date,
    "physical_location" text,
    "baggie_barcode" text,
    "status" text DEFAULT 'shelved'::text NOT NULL,
    "returned_in_transaction_id" uuid,
    "returned_at" timestamptz,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "wine_cellar_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_status_check" CHECK (status = ANY (ARRAY['shelved'::text, 'ready_to_return'::text, 'returned'::text, 'destroyed'::text]));

ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE RESTRICT;

ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_returned_in_transaction_id_fkey" FOREIGN KEY (returned_in_transaction_id) REFERENCES return_transactions(id) ON DELETE SET NULL;

ALTER TABLE public."wine_cellar"
    ADD CONSTRAINT "wine_cellar_transaction_item_id_fkey" FOREIGN KEY (transaction_item_id) REFERENCES return_transaction_items(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wc_created_at ON public.wine_cellar USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wc_expected_date ON public.wine_cellar USING btree (expected_returnable_date);
CREATE INDEX IF NOT EXISTS idx_wc_expiration ON public.wine_cellar USING btree (expiration_date);
CREATE INDEX IF NOT EXISTS idx_wc_ndc ON public.wine_cellar USING btree (ndc);
CREATE INDEX IF NOT EXISTS idx_wc_pharmacy ON public.wine_cellar USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_wc_status ON public.wine_cellar USING btree (status);
CREATE INDEX IF NOT EXISTS idx_wc_transaction_item ON public.wine_cellar USING btree (transaction_item_id);

-- Row Level Security
ALTER TABLE public."wine_cellar" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access via service role" ON public."wine_cellar";
CREATE POLICY "Allow all access via service role"
    ON public."wine_cellar"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);


