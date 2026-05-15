-- Function : get_admin_document_by_id
-- Arguments: p_document_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_document_by_id(p_document_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_document_by_id(p_document_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
