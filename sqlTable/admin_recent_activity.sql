-- ============================================================
-- Table: admin_recent_activity
-- Stores activity records for admin dashboard
-- Records are automatically created via triggers when:
-- - A pharmacy uploads a new document
-- - A pharmacy adds a new product to their list
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_recent_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL,
  activity_type character varying(50) NOT NULL,
  entity_id uuid NOT NULL,
  entity_name character varying(500) NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT admin_recent_activity_pkey PRIMARY KEY (id),
  CONSTRAINT admin_recent_activity_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) 
    REFERENCES pharmacy (id) ON DELETE CASCADE,
  CONSTRAINT admin_recent_activity_activity_type_check CHECK (
    activity_type::text = ANY (
      ARRAY[
        'document_uploaded'::character varying,
        'product_added'::character varying,
        'pharmacy_registered'::character varying
      ]::text[]
    )
  )
) TABLESPACE pg_default;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_pharmacy_id 
  ON public.admin_recent_activity USING btree (pharmacy_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_activity_type 
  ON public.admin_recent_activity USING btree (activity_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_created_at 
  ON public.admin_recent_activity USING btree (created_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_admin_recent_activity_entity_id 
  ON public.admin_recent_activity USING btree (entity_id) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.admin_recent_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exist first to avoid conflicts)
DROP POLICY IF EXISTS admin_recent_activity_select_policy ON public.admin_recent_activity;
DROP POLICY IF EXISTS admin_recent_activity_insert_policy ON public.admin_recent_activity;

-- Admin can read all activities
CREATE POLICY admin_recent_activity_select_policy ON public.admin_recent_activity
  FOR SELECT
  USING (true);

-- Service role can insert (used by triggers)
CREATE POLICY admin_recent_activity_insert_policy ON public.admin_recent_activity
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.admin_recent_activity TO authenticated;
GRANT ALL ON public.admin_recent_activity TO service_role;

