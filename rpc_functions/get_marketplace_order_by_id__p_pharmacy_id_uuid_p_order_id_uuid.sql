-- Function : get_marketplace_order_by_id
-- Arguments: p_pharmacy_id uuid, p_order_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_marketplace_order_by_id(p_pharmacy_id uuid, p_order_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_marketplace_order_by_id(p_pharmacy_id uuid, p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order JSONB;
  v_items JSONB;
BEGIN
  -- Get order (verify it belongs to pharmacy)
  SELECT jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'status', o.status,
    'subtotal', o.subtotal,
    'taxAmount', o.tax_amount,
    'taxRate', o.tax_rate,
    'shippingAmount', o.shipping_amount,
    'discountAmount', o.discount_amount,
    'totalAmount', o.total_amount,
    'totalSavings', o.total_savings,
    'paymentMethodType', o.payment_method_type,
    'paymentMethodLast4', o.payment_method_last4,
    'paymentMethodBrand', o.payment_method_brand,
    'stripeReceiptUrl', o.stripe_receipt_url,
    'notes', o.notes,
    'createdAt', o.created_at,
    'paidAt', o.paid_at,
    'shippedAt', o.shipped_at,
    'deliveredAt', o.delivered_at
  )
  INTO v_order
  FROM marketplace_orders o
  WHERE o.id = p_order_id AND o.pharmacy_id = p_pharmacy_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Order not found'
    );
  END IF;
  
  -- Get order items with image from marketplace_deals
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'dealId', oi.deal_id,
      'productName', oi.product_name,
      'ndc', oi.ndc,
      'category', oi.category,
      'distributor', oi.distributor,
      'quantity', oi.quantity,
      'unitPrice', oi.unit_price,
      'originalPrice', oi.original_price,
      'lineTotal', oi.line_total,
      'lineSavings', oi.line_savings,
      'imageUrl', d.image_url
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM marketplace_order_items oi
  LEFT JOIN marketplace_deals d ON d.id = oi.deal_id
  WHERE oi.order_id = p_order_id;
  
  v_order := v_order || jsonb_build_object('items', v_items);
  
  RETURN jsonb_build_object(
    'error', false,
    'order', v_order
  );
END;
$function$;
