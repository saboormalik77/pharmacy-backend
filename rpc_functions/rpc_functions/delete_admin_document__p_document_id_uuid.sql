-- Function : delete_admin_document
-- Arguments: p_document_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_admin_document(p_document_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_admin_document(p_document_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
