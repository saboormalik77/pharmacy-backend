-- ============================================================
-- Triggers for admin_recent_activity table
-- Automatically records activity when:
-- 1. A pharmacy uploads a new document
-- 2. A pharmacy adds a new product to their list
-- 3. A new pharmacy registers
-- ============================================================

-- ============================================================
-- TRIGGER 1: Document Upload Activity
-- Fires when a new row is inserted into uploaded_documents
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_record_document_upload_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert activity record for document upload
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

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_record_document_upload_activity ON public.uploaded_documents;

CREATE TRIGGER trg_record_document_upload_activity
    AFTER INSERT ON public.uploaded_documents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_document_upload_activity();


-- ============================================================
-- TRIGGER 2: Product Addition Activity
-- Fires when a new row is inserted into product_list_items
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_record_product_add_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert activity record for product addition
    -- Note: added_by is the pharmacy user's auth.users id which corresponds to pharmacy.id
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

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_record_product_add_activity ON public.product_list_items;

CREATE TRIGGER trg_record_product_add_activity
    AFTER INSERT ON public.product_list_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_product_add_activity();


-- ============================================================
-- TRIGGER 3: Pharmacy Registration Activity
-- Fires when a new row is inserted into pharmacy
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_record_pharmacy_registration_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert activity record for pharmacy registration
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

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_record_pharmacy_registration_activity ON public.pharmacy;

CREATE TRIGGER trg_record_pharmacy_registration_activity
    AFTER INSERT ON public.pharmacy
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_pharmacy_registration_activity();


-- ============================================================
-- Grant execute permissions on trigger functions
-- ============================================================
GRANT EXECUTE ON FUNCTION trigger_record_document_upload_activity() TO service_role;
GRANT EXECUTE ON FUNCTION trigger_record_product_add_activity() TO service_role;
GRANT EXECUTE ON FUNCTION trigger_record_pharmacy_registration_activity() TO service_role;

-- ============================================================
-- Notes:
-- ============================================================
-- 1. These triggers automatically create activity records
-- 2. The admin_recent_activity table must exist before running these triggers
-- 3. Triggers use SECURITY DEFINER to ensure they can insert records
-- 4. pharmacy_id is derived from:
--    - uploaded_documents: pharmacy_id column
--    - product_list_items: added_by column (which is the auth.users id = pharmacy.id)
--    - pharmacy: id column (the pharmacy's own ID)
-- ============================================================

