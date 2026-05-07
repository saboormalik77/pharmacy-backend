-- ============================================================
-- Admin Documents Management RPC Functions
-- Used by: /api/admin/documents endpoints
-- ============================================================
-- Functions:
-- 1. get_admin_documents_list - List documents with search/filter/pagination AND stats
-- 2. get_admin_document_by_id - Get single document details
-- 3. delete_admin_document - Delete a document
-- ============================================================

-- ============================================================
-- FUNCTION 1: get_admin_documents_list
-- ============================================================
-- Lists all documents with search, filter, pagination AND stats
-- Stats are included in the response (merged from stats function)
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_documents_list(TEXT, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_admin_documents_list(
    p_search TEXT DEFAULT NULL,
    p_pharmacy_id UUID DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_documents JSONB;
    v_total_count INTEGER;
    v_offset INTEGER;
    v_normalized_search TEXT;
    -- Stats variables (global, not affected by search/filter)
    v_stats_total_documents INTEGER;
    v_stats_total_size BIGINT;
    v_stats_total_credit NUMERIC;
    v_stats_by_status JSONB;
    v_stats_by_source JSONB;
    v_stats_recent_uploads INTEGER;
BEGIN
    -- Normalize search parameter: trim whitespace and handle empty strings
    IF p_search IS NOT NULL THEN
        v_normalized_search := TRIM(p_search);
        -- Set to NULL if empty after trimming
        IF v_normalized_search = '' THEN
            v_normalized_search := NULL;
        END IF;
    ELSE
        v_normalized_search := NULL;
    END IF;
    
    -- Calculate offset
    v_offset := (p_page - 1) * p_limit;
    
    -- Get GLOBAL stats (not affected by search/filter)
    SELECT COUNT(*)::INTEGER INTO v_stats_total_documents FROM uploaded_documents;
    SELECT COALESCE(SUM(file_size), 0)::BIGINT INTO v_stats_total_size FROM uploaded_documents;
    SELECT COALESCE(SUM(total_credit_amount), 0)::NUMERIC INTO v_stats_total_credit 
    FROM uploaded_documents WHERE total_credit_amount IS NOT NULL;
    
    -- Get counts by status
    SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::JSONB)
    INTO v_stats_by_status
    FROM (
        SELECT status, COUNT(*)::INTEGER as cnt
        FROM uploaded_documents
        GROUP BY status
    ) s;
    
    -- Get counts by source
    SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::JSONB)
    INTO v_stats_by_source
    FROM (
        SELECT source, COUNT(*)::INTEGER as cnt
        FROM uploaded_documents
        GROUP BY source
    ) s;
    
    -- Get uploads in last 7 days
    SELECT COUNT(*)::INTEGER INTO v_stats_recent_uploads
    FROM uploaded_documents
    WHERE uploaded_at >= NOW() - INTERVAL '7 days';
    
    -- Get total count with filters (for pagination)
    SELECT COUNT(*)::INTEGER
    INTO v_total_count
    FROM uploaded_documents ud
    LEFT JOIN pharmacy p ON ud.pharmacy_id = p.id
    LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
    WHERE 
        -- Pharmacy filter
        (p_pharmacy_id IS NULL OR ud.pharmacy_id = p_pharmacy_id)
        -- Search filter (pharmacy name, file name, or document id)
        AND (
            v_normalized_search IS NULL 
            OR LOWER(p.pharmacy_name) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(p.name) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(ud.file_name) LIKE LOWER('%' || v_normalized_search || '%')
            OR CAST(ud.id AS TEXT) LIKE LOWER('%' || v_normalized_search || '%')
        );
    
    -- Get documents with all required fields
    WITH document_data AS (
        SELECT 
            ud.id,
            ud.file_name AS "fileName",
            ud.file_size AS "fileSize",
            ud.file_type AS "fileType",
            ud.file_url AS "fileUrl",
            ud.source,
            ud.status,
            ud.uploaded_at AS "uploadedAt",
            ud.processed_at AS "processedAt",
            ud.error_message AS "errorMessage",
            ud.extracted_items AS "extractedItems",
            ud.total_credit_amount AS "totalCreditAmount",
            ud.processing_progress AS "processingProgress",
            ud.report_date AS "reportDate",
            -- Pharmacy info
            ud.pharmacy_id AS "pharmacyId",
            p.pharmacy_name AS "pharmacyName",
            p.name AS "pharmacyOwner",
            p.email AS "pharmacyEmail",
            -- Reverse distributor info
            ud.reverse_distributor_id AS "reverseDistributorId",
            rd.name AS "reverseDistributorName",
            rd.code AS "reverseDistributorCode"
        FROM uploaded_documents ud
        LEFT JOIN pharmacy p ON ud.pharmacy_id = p.id
        LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
        WHERE 
            -- Pharmacy filter
            (p_pharmacy_id IS NULL OR ud.pharmacy_id = p_pharmacy_id)
            -- Search filter
            AND (
                v_normalized_search IS NULL 
                OR LOWER(p.pharmacy_name) LIKE LOWER('%' || v_normalized_search || '%')
                OR LOWER(p.name) LIKE LOWER('%' || v_normalized_search || '%')
                OR LOWER(ud.file_name) LIKE LOWER('%' || v_normalized_search || '%')
                OR CAST(ud.id AS TEXT) LIKE LOWER('%' || v_normalized_search || '%')
            )
        ORDER BY ud.uploaded_at DESC
        LIMIT p_limit
        OFFSET v_offset
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', dd.id,
            'fileName', dd."fileName",
            'fileSize', dd."fileSize",
            'fileType', dd."fileType",
            'fileUrl', dd."fileUrl",
            'source', dd.source,
            'status', dd.status,
            'uploadedAt', dd."uploadedAt",
            'processedAt', dd."processedAt",
            'errorMessage', dd."errorMessage",
            'extractedItems', dd."extractedItems",
            'totalCreditAmount', dd."totalCreditAmount",
            'processingProgress', dd."processingProgress",
            'reportDate', dd."reportDate",
            'pharmacyId', dd."pharmacyId",
            'pharmacyName', dd."pharmacyName",
            'pharmacyOwner', dd."pharmacyOwner",
            'pharmacyEmail', dd."pharmacyEmail",
            'reverseDistributorId', dd."reverseDistributorId",
            'reverseDistributorName', dd."reverseDistributorName",
            'reverseDistributorCode', dd."reverseDistributorCode"
        )
    ), '[]'::JSONB)
    INTO v_documents
    FROM document_data dd;
    
    -- Build result with stats included
    v_result := jsonb_build_object(
        'documents', v_documents,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total_count,
            'totalPages', CEIL(v_total_count::NUMERIC / p_limit::NUMERIC)::INTEGER
        ),
        'filters', jsonb_build_object(
            'search', v_normalized_search,
            'pharmacyId', p_pharmacy_id
        ),
        'stats', jsonb_build_object(
            'totalDocuments', v_stats_total_documents,
            'totalFileSize', v_stats_total_size,
            'totalCreditAmount', v_stats_total_credit,
            'byStatus', v_stats_by_status,
            'bySource', v_stats_by_source,
            'recentUploads', v_stats_recent_uploads
        ),
        'generatedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================
-- FUNCTION 2: get_admin_document_by_id
-- ============================================================
-- Get single document details by ID
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_document_by_id(UUID);

CREATE OR REPLACE FUNCTION get_admin_document_by_id(
    p_document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_document JSONB;
    v_exists BOOLEAN;
BEGIN
    -- Check if document exists
    SELECT EXISTS(SELECT 1 FROM uploaded_documents WHERE id = p_document_id)
    INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Document not found',
            'code', 404
        );
    END IF;
    
    -- Get document details with joins
    SELECT jsonb_build_object(
        'id', ud.id,
        'fileName', ud.file_name,
        'fileSize', ud.file_size,
        'fileType', ud.file_type,
        'fileUrl', ud.file_url,
        'source', ud.source,
        'status', ud.status,
        'uploadedAt', ud.uploaded_at,
        'processedAt', ud.processed_at,
        'errorMessage', ud.error_message,
        'extractedItems', ud.extracted_items,
        'totalCreditAmount', ud.total_credit_amount,
        'processingProgress', ud.processing_progress,
        'reportDate', ud.report_date,
        'pharmacyId', ud.pharmacy_id,
        'pharmacyName', p.pharmacy_name,
        'pharmacyOwner', p.name,
        'pharmacyEmail', p.email,
        'pharmacyPhone', p.phone,
        'reverseDistributorId', ud.reverse_distributor_id,
        'reverseDistributorName', rd.name,
        'reverseDistributorCode', rd.code
    )
    INTO v_document
    FROM uploaded_documents ud
    LEFT JOIN pharmacy p ON ud.pharmacy_id = p.id
    LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
    WHERE ud.id = p_document_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'document', v_document,
        'generatedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================
-- FUNCTION 3: delete_admin_document
-- ============================================================
-- Delete a document by ID
-- ============================================================

DROP FUNCTION IF EXISTS delete_admin_document(UUID);

CREATE OR REPLACE FUNCTION delete_admin_document(
    p_document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_exists BOOLEAN;
    v_document_info JSONB;
BEGIN
    -- Check if document exists and get its info
    SELECT EXISTS(SELECT 1 FROM uploaded_documents WHERE id = p_document_id)
    INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Document not found',
            'code', 404
        );
    END IF;
    
    -- Get document info before deletion
    SELECT jsonb_build_object(
        'id', ud.id,
        'fileName', ud.file_name,
        'pharmacyName', p.pharmacy_name
    )
    INTO v_document_info
    FROM uploaded_documents ud
    LEFT JOIN pharmacy p ON ud.pharmacy_id = p.id
    WHERE ud.id = p_document_id;
    
    -- Delete the document
    DELETE FROM uploaded_documents WHERE id = p_document_id;
    
    -- Return success response
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Document deleted successfully',
        'deletedDocument', v_document_info,
        'deletedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================
-- Grant Permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION get_admin_documents_list(TEXT, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_documents_list(TEXT, UUID, INTEGER, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION get_admin_document_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_document_by_id(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION delete_admin_document(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_admin_document(UUID) TO service_role;

-- ============================================================
-- Example Usage:
-- ============================================================
-- List all documents (includes stats):
-- SELECT get_admin_documents_list();
--
-- Search documents:
-- SELECT get_admin_documents_list('HealthFirst', NULL, 1, 20);
--
-- Filter by pharmacy:
-- SELECT get_admin_documents_list(NULL, 'pharmacy-uuid-here'::UUID, 1, 20);
--
-- Get single document:
-- SELECT get_admin_document_by_id('document-uuid-here'::UUID);
--
-- Delete document:
-- SELECT delete_admin_document('document-uuid-here'::UUID);
