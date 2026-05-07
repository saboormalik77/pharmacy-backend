-- ============================================================
-- SETUP SCRIPT: Admin Recent Activity Feature
-- ============================================================
-- This script creates all necessary database objects for the
-- admin recent activity feature:
-- 1. admin_recent_activity table
-- 2. Triggers for uploaded_documents and product_list_items
-- 3. RPC function get_admin_recent_activity
-- 
-- Run this script in Supabase SQL Editor to set up the feature
-- ============================================================


-- ============================================================
-- PART 1: Create admin_recent_activity table
-- ============================================================

-- Create table if it doesn't exist
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
    REFERENCES pharmacy (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Drop and recreate the constraint to ensure it includes all activity types
-- This handles the case where the table was created with an older constraint
ALTER TABLE public.admin_recent_activity 
DROP CONSTRAINT IF EXISTS admin_recent_activity_activity_type_check;

ALTER TABLE public.admin_recent_activity 
ADD CONSTRAINT admin_recent_activity_activity_type_check CHECK (
  activity_type::text = ANY (
    ARRAY[
      'document_uploaded'::character varying,
      'product_added'::character varying,
      'pharmacy_registered'::character varying
    ]::text[]
  )
);

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

-- RLS Policies (drop if exist first)
DROP POLICY IF EXISTS admin_recent_activity_select_policy ON public.admin_recent_activity;
DROP POLICY IF EXISTS admin_recent_activity_insert_policy ON public.admin_recent_activity;

CREATE POLICY admin_recent_activity_select_policy ON public.admin_recent_activity
  FOR SELECT
  USING (true);

CREATE POLICY admin_recent_activity_insert_policy ON public.admin_recent_activity
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.admin_recent_activity TO authenticated;
GRANT ALL ON public.admin_recent_activity TO service_role;


-- ============================================================
-- PART 2: Create Triggers
-- ============================================================

-- Trigger function for document uploads
CREATE OR REPLACE FUNCTION trigger_record_document_upload_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.admin_recent_activity (
        pharmacy_id,
        activity_type,
        entity_id,
        entity_name,
        metadata
    )
    VALUES (
        NEW.pharmacy_id,
        'document_uploaded',
        NEW.id,
        NEW.file_name,
        jsonb_build_object(
            'file_size', NEW.file_size,
            'file_type', NEW.file_type,
            'source', NEW.source,
            'status', NEW.status,
            'reverse_distributor_id', NEW.reverse_distributor_id
        )
    );
    
    RETURN NEW;
END;
$$;

-- Drop and create trigger for document uploads
DROP TRIGGER IF EXISTS trg_record_document_upload_activity ON public.uploaded_documents;

CREATE TRIGGER trg_record_document_upload_activity
    AFTER INSERT ON public.uploaded_documents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_document_upload_activity();


-- Trigger function for product additions
CREATE OR REPLACE FUNCTION trigger_record_product_add_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.admin_recent_activity (
        pharmacy_id,
        activity_type,
        entity_id,
        entity_name,
        metadata
    )
    VALUES (
        NEW.added_by,
        'product_added',
        NEW.id,
        COALESCE(NEW.product_name, 'NDC: ' || NEW.ndc),
        jsonb_build_object(
            'ndc', NEW.ndc,
            'product_name', NEW.product_name,
            'full_units', NEW.full_units,
            'partial_units', NEW.partial_units,
            'lot_number', NEW.lot_number,
            'expiration_date', NEW.expiration_date
        )
    );
    
    RETURN NEW;
END;
$$;

-- Drop and create trigger for product additions
DROP TRIGGER IF EXISTS trg_record_product_add_activity ON public.product_list_items;

CREATE TRIGGER trg_record_product_add_activity
    AFTER INSERT ON public.product_list_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_product_add_activity();

-- Trigger function for pharmacy registration
CREATE OR REPLACE FUNCTION trigger_record_pharmacy_registration_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.admin_recent_activity (
        pharmacy_id,
        activity_type,
        entity_id,
        entity_name,
        metadata
    )
    VALUES (
        NEW.id,
        'pharmacy_registered',
        NEW.id,
        NEW.pharmacy_name,
        jsonb_build_object(
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'npi_number', NEW.npi_number,
            'dea_number', NEW.dea_number
        )
    );
    
    RETURN NEW;
END;
$$;

-- Drop and create trigger for pharmacy registration
DROP TRIGGER IF EXISTS trg_record_pharmacy_registration_activity ON public.pharmacy;

CREATE TRIGGER trg_record_pharmacy_registration_activity
    AFTER INSERT ON public.pharmacy
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_pharmacy_registration_activity();

-- Grant execute permissions on trigger functions
GRANT EXECUTE ON FUNCTION trigger_record_document_upload_activity() TO service_role;
GRANT EXECUTE ON FUNCTION trigger_record_product_add_activity() TO service_role;
GRANT EXECUTE ON FUNCTION trigger_record_pharmacy_registration_activity() TO service_role;


-- ============================================================
-- PART 3: Create RPC Function
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID);

CREATE OR REPLACE FUNCTION get_admin_recent_activity(
    p_activity_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_pharmacy_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_activities JSONB;
    v_total_count INTEGER;
    v_today_count INTEGER;
    v_this_week_count INTEGER;
BEGIN
    -- Get total count (with filters)
    SELECT COUNT(*)::INTEGER
    INTO v_total_count
    FROM admin_recent_activity a
    WHERE (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id);

    -- Get today's activity count
    SELECT COUNT(*)::INTEGER
    INTO v_today_count
    FROM admin_recent_activity a
    WHERE a.created_at >= DATE_TRUNC('day', NOW())
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id);

    -- Get this week's activity count
    SELECT COUNT(*)::INTEGER
    INTO v_this_week_count
    FROM admin_recent_activity a
    WHERE a.created_at >= DATE_TRUNC('week', NOW())
    AND (p_activity_type IS NULL OR a.activity_type = p_activity_type)
    AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id);

    -- Get activities with pharmacy info
    SELECT COALESCE(jsonb_agg(activity_data ORDER BY activity_data->>'createdAt' DESC), '[]'::JSONB)
    INTO v_activities
    FROM (
        SELECT jsonb_build_object(
            'id', a.id,
            'activityType', a.activity_type,
            'entityId', a.entity_id,
            'entityName', a.entity_name,
            'metadata', a.metadata,
            'createdAt', a.created_at,
            'pharmacy', jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'pharmacyName', p.pharmacy_name,
                'email', p.email
            )
        ) as activity_data
        FROM admin_recent_activity a
        INNER JOIN pharmacy p ON a.pharmacy_id = p.id
        WHERE (p_activity_type IS NULL OR a.activity_type = p_activity_type)
        AND (p_pharmacy_id IS NULL OR a.pharmacy_id = p_pharmacy_id)
        ORDER BY a.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) sub;

    -- Build final result
    v_result := jsonb_build_object(
        'activities', v_activities,
        'pagination', jsonb_build_object(
            'total', v_total_count,
            'limit', p_limit,
            'offset', p_offset,
            'hasMore', (p_offset + p_limit) < v_total_count
        ),
        'stats', jsonb_build_object(
            'todayCount', v_today_count,
            'thisWeekCount', v_this_week_count,
            'totalCount', v_total_count
        ),
        'filters', jsonb_build_object(
            'activityType', p_activity_type,
            'pharmacyId', p_pharmacy_id
        ),
        'generatedAt', NOW()
    );

    RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_activity(TEXT, INTEGER, INTEGER, UUID) TO service_role;


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these after setup to verify everything is working:

-- Check table exists:
-- SELECT * FROM admin_recent_activity LIMIT 5;

-- Check triggers exist:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name LIKE '%activity%';

-- Test RPC function:
-- SELECT get_admin_recent_activity();

-- Test with filters:
-- SELECT get_admin_recent_activity('document_uploaded', 10, 0, NULL);

