import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import Stripe from 'stripe';

// ============================================================
// Stripe Configuration
// ============================================================

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set - marketplace checkout will not work');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
    })
  : null;

// ============================================================
// Types
// ============================================================

export interface OrderItem {
  id: string;
  dealId: string;
  productName: string;
  ndc: string | null;
  category: string | null;
  distributor: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  lineTotal: number;
  lineSavings: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalSavings: number;
  paymentMethodType: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  stripeReceiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items?: OrderItem[];
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  totalSavings: number;
  itemCount: number;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface CreateCheckoutResponse {
  sessionId: string;
  url: string;
  orderId: string;
  orderNumber: string;
}

export interface OrderListResponse {
  orders: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Create Stripe Checkout session for marketplace cart
 * Uses PostgreSQL RPC function for order creation
 */
export const createCheckoutSession = async (
  pharmacyId: string,
  email: string,
  pharmacyName?: string
): Promise<CreateCheckoutResponse> => {
  if (!stripe) {
    throw new AppError('Stripe is not configured', 500);
  }

  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // First validate the cart
  const { data: validationData, error: validationError } = await supabaseAdmin.rpc('validate_pharmacy_cart', {
    p_pharmacy_id: pharmacyId,
  });

  if (validationError) {
    throw new AppError(`Failed to validate cart: ${validationError.message}`, 400);
  }

  if (!validationData || typeof validationData !== 'object') {
    throw new AppError('Invalid cart validation response', 400);
  }

  const validation = validationData as any;

  if (!validation.valid) {
    throw new AppError(validation.message || 'Cart validation failed', 400);
  }

  if (validation.summary?.validItemCount === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // Get or create Stripe customer
  let customerId: string;
  
  // Check if pharmacy has a customer ID from subscription
  const { data: subscriptionData } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (subscriptionData?.stripe_customer_id) {
    customerId = subscriptionData.stripe_customer_id;
  } else {
    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name: pharmacyName || email,
      metadata: {
        pharmacy_id: pharmacyId,
        source: 'marketplace',
      },
    });
    customerId = customer.id;
  }

  // Get cart items for line items
  const { data: cartData, error: cartError } = await supabaseAdmin.rpc('get_pharmacy_cart', {
    p_pharmacy_id: pharmacyId,
  });

  if (cartError) {
    throw new AppError(`Failed to get cart: ${cartError.message}`, 400);
  }

  // Type guard for cart data
  if (!cartData || !cartData.items || !Array.isArray(cartData.items) || cartData.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: (cartData.items as any[]).map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productName,
          description: item.ndc ? `NDC: ${item.ndc} | ${item.distributor}` : item.distributor,
          metadata: {
            deal_id: item.dealId,
            ndc: item.ndc || '',
          },
        },
        unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
      },
      quantity: item.quantity,
    })),
    automatic_tax: { enabled: false }, // We handle tax ourselves
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/marketplace`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/marketplace/checkout?canceled=true`,
    metadata: {
      pharmacy_id: pharmacyId,
      type: 'marketplace_order',
      subtotal: (cartData.summary?.subtotal || 0).toString(),
      tax_amount: (cartData.summary?.estimatedTax || 0).toString(),
      total_savings: (cartData.summary?.totalSavings || 0).toString(),
    },
    payment_intent_data: {
      metadata: {
        pharmacy_id: pharmacyId,
        type: 'marketplace_order',
      },
    },
  });

  // Create order in database with pending status
  const { data: orderData, error: orderError } = await supabaseAdmin.rpc('create_marketplace_order_from_cart', {
    p_pharmacy_id: pharmacyId,
    p_stripe_checkout_session_id: session.id,
    p_stripe_customer_id: customerId,
    p_notes: null,
  });

  if (orderError) {
    throw new AppError(`Failed to create order: ${orderError.message}`, 400);
  }

  if (orderData && typeof orderData === 'object' && 'error' in orderData && orderData.error) {
    throw new AppError((orderData as any).message || 'Failed to create order', 400);
  }

  const order = (orderData as any)?.order;
  if (!order || !order.id || !order.orderNumber) {
    throw new AppError('Failed to create order: Invalid response', 400);
  }

  return {
    sessionId: session.id,
    url: session.url || '',
    orderId: order.id,
    orderNumber: order.orderNumber,
  };
};

/**
 * Handle successful payment from Stripe webhook
 */
export const handlePaymentSuccess = async (
  sessionId: string,
  paymentIntentId: string,
  paymentStatus: string,
  paymentMethodDetails?: {
    type?: string;
    last4?: string;
    brand?: string;
  },
  receiptUrl?: string
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('update_marketplace_order_payment', {
    p_stripe_checkout_session_id: sessionId,
    p_stripe_payment_intent_id: paymentIntentId,
    p_stripe_payment_status: paymentStatus,
    p_payment_method_type: paymentMethodDetails?.type || null,
    p_payment_method_last4: paymentMethodDetails?.last4 || null,
    p_payment_method_brand: paymentMethodDetails?.brand || null,
    p_stripe_receipt_url: receiptUrl || null,
  });

  if (error) {
    throw new AppError(`Failed to update order payment: ${error.message}`, 400);
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new AppError((data as any).message || 'Failed to update order payment', 400);
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (
  pharmacyId: string,
  orderId: string
): Promise<Order> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_marketplace_order_by_id', {
    p_pharmacy_id: pharmacyId,
    p_order_id: orderId,
  });

  if (error) {
    throw new AppError(`Failed to get order: ${error.message}`, 400);
  }

  if (!data || (typeof data === 'object' && 'error' in data && data.error)) {
    throw new AppError((data as any)?.message || 'Order not found', 404);
  }

  const order = (data as any)?.order;
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return order as Order;
};

/**
 * Get order by checkout session ID (for success page)
 */
export const getOrderBySessionId = async (
  pharmacyId: string,
  sessionId: string
): Promise<Order | null> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // First, get the order ID from session ID
  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('marketplace_orders')
    .select('id')
    .eq('stripe_checkout_session_id', sessionId)
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (orderError || !orderData) {
    return null;
  }

  return getOrderById(pharmacyId, orderData.id);
};

/**
 * Get pharmacy orders list
 */
export const getPharmacyOrders = async (
  pharmacyId: string,
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<OrderListResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_pharmacy_marketplace_orders', {
    p_pharmacy_id: pharmacyId,
    p_page: page,
    p_limit: limit,
    p_status: status || null,
  });

  if (error) {
    throw new AppError(`Failed to get orders: ${error.message}`, 400);
  }

  if (!data) {
    return {
      orders: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }

  return {
    orders: (data as any).orders || [],
    pagination: (data as any).pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  };
};

/**
 * Cancel order
 */
export const cancelOrder = async (
  pharmacyId: string,
  orderId: string
): Promise<{ message: string; orderNumber: string }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('cancel_marketplace_order', {
    p_pharmacy_id: pharmacyId,
    p_order_id: orderId,
  });

  if (error) {
    throw new AppError(`Failed to cancel order: ${error.message}`, 400);
  }

  if (!data || (typeof data === 'object' && 'error' in data && data.error)) {
    throw new AppError((data as any)?.message || 'Failed to cancel order', 400);
  }

  const result = data as any;
  return {
    message: result.message || 'Order cancelled successfully',
    orderNumber: result.orderNumber || '',
  };
};

/**
 * Get Stripe session details (for verification)
 */
export const getStripeSession = async (
  sessionId: string
): Promise<Stripe.Checkout.Session | null> => {
  if (!stripe) {
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'payment_intent.payment_method'],
    });
    return session;
  } catch (error) {
    console.error('Failed to retrieve Stripe session:', error);
    return null;
  }
};

