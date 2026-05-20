-- Function : list_processor_notifications
-- Arguments: p_processor_id uuid, p_limit integer, p_offset integer, p_only_unread boolean
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_processor_notifications(p_processor_id uuid, p_limit integer, p_offset integer, p_only_unread boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.list_processor_notifications(p_processor_id uuid, p_limit integer, p_offset integer, p_only_unread boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_limit         INTEGER := COALESCE(NULLIF(p_limit, 0), 20);
    v_offset        INTEGER := COALESCE(p_offset, 0);
    v_total         INTEGER;
    v_unread_count  INTEGER;
    v_items         JSONB;
BEGIN
    IF p_processor_id IS NULL THEN
        RAISE EXCEPTION 'processor_id is required' USING ERRCODE = '22023';
    END IF;

    IF v_limit < 1   THEN v_limit  := 1;   END IF;
    IF v_limit > 100 THEN v_limit  := 100; END IF;
    IF v_offset < 0  THEN v_offset := 0;   END IF;

    SELECT COUNT(*) INTO v_total
    FROM processor_notifications pn
    WHERE pn.processor_id = p_processor_id
      AND (NOT COALESCE(p_only_unread, FALSE) OR pn.is_read = FALSE);

    SELECT COUNT(*) INTO v_unread_count
    FROM processor_notifications pn
    WHERE pn.processor_id = p_processor_id
      AND pn.is_read = FALSE;

    SELECT COALESCE(jsonb_agg(row), '[]'::jsonb) INTO v_items
    FROM (
        SELECT jsonb_build_object(
                   'id',          pn.id,
                   'type',        pn.type,
                   'title',       pn.title,
                   'message',     pn.message,
                   'entity_type', pn.entity_type,
                   'entity_id',   pn.entity_id,
                   'metadata',    pn.metadata,
                   'is_read',     pn.is_read,
                   'read_at',     pn.read_at,
                   'created_at',  pn.created_at
               ) AS row
        FROM processor_notifications pn
        WHERE pn.processor_id = p_processor_id
          AND (NOT COALESCE(p_only_unread, FALSE) OR pn.is_read = FALSE)
        ORDER BY pn.created_at DESC
        LIMIT v_limit OFFSET v_offset
    ) sub;

    RETURN jsonb_build_object(
        'notifications', v_items,
        'pagination', jsonb_build_object(
            'total',    v_total,
            'limit',    v_limit,
            'offset',   v_offset,
            'has_more', v_offset + v_limit < v_total
        ),
        'unread_count', v_unread_count
    );
END;
$function$;
