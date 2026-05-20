-- Function : get_pharmacy_marketplace_orders
-- Arguments: p_pharmacy_id uuid, p_page integer, p_limit integer, p_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_marketplace_orders(p_pharmacy_id uuid, p_page integer, p_limit integer, p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_marketplace_orders(p_pharmacy_id uuid, p_page integer DEFAULT 1, p_limit integer DEFAULT 10, p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_orders JSONB;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  -- Get total count
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM marketplace_orders
  WHERE pharmacy_id = p_pharmacy_id
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR status = p_status);
  
  -- Get orders
  SELECT COALESCE(jsonb_agg(order_row), '[]'::jsonb)
  INTO v_orders
  FROM (
    SELECT jsonb_build_object(
      'id', o.id,
      'orderNumber', o.order_number,
      'status', o.status,
      'totalAmount', o.total_amount,
      'totalSavings', o.total_savings,
      'itemCount', (SELECT COUNT(*) FROM marketplace_order_items WHERE order_id = o.id),
      'paymentMethodBrand', o.payment_method_brand,
      'paymentMethodLast4', o.payment_method_last4,
      'createdAt', o.created_at,
      'paidAt', o.paid_at
    ) AS order_row
    FROM marketplace_orders o
    WHERE o.pharmacy_id = p_pharmacy_id
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR o.status = p_status)
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  ) sub;
  
  RETURN jsonb_build_object(
    'orders', v_orders,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::NUMERIC / p_limit)::INTEGER
    )
  );
END;
$function$;
