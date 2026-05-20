-- Function : get_featured_deal_info
-- Arguments: p_type text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_featured_deal_info(p_type text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_featured_deal_info(p_type text DEFAULT 'day'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_manual_deal JSONB;
  v_type_label TEXT;
BEGIN
  -- Validate type
  IF p_type NOT IN ('day', 'week', 'month') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid type. Must be day, week, or month'
    );
  END IF;

  v_type_label := CASE p_type
    WHEN 'day' THEN 'Day'
    WHEN 'week' THEN 'Week'
    WHEN 'month' THEN 'Month'
  END;

  -- Get manual selection based on type
  IF p_type = 'day' THEN
    SELECT jsonb_build_object(
      'id', d.id,
      'dealNumber', d.deal_number,
      'productName', d.product_name,
      'isFeatured', d.is_deal_of_the_day,
      'featuredUntil', d.deal_of_the_day_until,
      'isExpired', d.deal_of_the_day_until IS NOT NULL AND d.deal_of_the_day_until < NOW(),
      'type', 'day',
      'selectionType', 'manual'
    )
    INTO v_manual_deal
    FROM marketplace_deals d
    WHERE d.is_deal_of_the_day = TRUE
    LIMIT 1;
    
  ELSIF p_type = 'week' THEN
    SELECT jsonb_build_object(
      'id', d.id,
      'dealNumber', d.deal_number,
      'productName', d.product_name,
      'isFeatured', d.is_deal_of_the_week,
      'featuredUntil', d.deal_of_the_week_until,
      'isExpired', d.deal_of_the_week_until IS NOT NULL AND d.deal_of_the_week_until < NOW(),
      'type', 'week',
      'selectionType', 'manual'
    )
    INTO v_manual_deal
    FROM marketplace_deals d
    WHERE d.is_deal_of_the_week = TRUE
    LIMIT 1;
    
  ELSIF p_type = 'month' THEN
    SELECT jsonb_build_object(
      'id', d.id,
      'dealNumber', d.deal_number,
      'productName', d.product_name,
      'isFeatured', d.is_deal_of_the_month,
      'featuredUntil', d.deal_of_the_month_until,
      'isExpired', d.deal_of_the_month_until IS NOT NULL AND d.deal_of_the_month_until < NOW(),
      'type', 'month',
      'selectionType', 'manual'
    )
    INTO v_manual_deal
    FROM marketplace_deals d
    WHERE d.is_deal_of_the_month = TRUE
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'type', p_type,
    'typeLabel', v_type_label,
    'deal', get_featured_deal(p_type),
    'manualDeal', v_manual_deal,
    'hasManualSelection', v_manual_deal IS NOT NULL
  );
END;
$function$;
