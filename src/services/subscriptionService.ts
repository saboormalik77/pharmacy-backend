import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import Stripe from 'stripe';

// Type alias to avoid conflict with local Subscription interface
type StripeSubscription = Stripe.Subscription;

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  stripe_product_id: string | null;
  features: string[];
  max_documents: number | null;
  max_distributors: number | null;
  analytics_features: string[];
  support_level: string;
  is_active: boolean;
  display_order: number;
}

export interface PharmacySubscription {
  id: string;
  pharmacy_id: string;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method: any;
  price: number | null;
  billing_interval: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_current_period_start: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean;
  stripe_canceled_at: string | null;
  stripe_ended_at: string | null;
  stripe_latest_invoice_id: string | null;
  stripe_payment_method_id: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all active subscription plans
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    throw new AppError(`Failed to fetch subscription plans: ${error.message}`, 500);
  }

  return (data || []).map((plan) => ({
    ...plan,
    features: Array.isArray(plan.features) ? plan.features : [],
    analytics_features: Array.isArray(plan.analytics_features) ? plan.analytics_features : [],
  }));
};

/**
 * Get a single subscription plan by ID
 */
export const getSubscriptionPlanById = async (planId: string): Promise<SubscriptionPlan> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new AppError(`Subscription plan not found: ${planId}`, 404);
  }

  return {
    ...data,
    features: Array.isArray(data.features) ? data.features : [],
    analytics_features: Array.isArray(data.analytics_features) ? data.analytics_features : [],
  };
};

/**
 * Get pharmacy subscription
 */
export const getPharmacySubscription = async (pharmacyId: string): Promise<PharmacySubscription | null> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No subscription found
      return null;
    }
    throw new AppError(`Failed to fetch subscription: ${error.message}`, 500);
  }

  return data;
};

/**
 * Create Stripe customer for pharmacy
 */
export const createStripeCustomer = async (
  pharmacyId: string,
  email: string,
  name?: string
): Promise<string> => {
  // Check if customer already exists
  const existingSubscription = await getPharmacySubscription(pharmacyId);
  if (existingSubscription?.stripe_customer_id) {
    return existingSubscription.stripe_customer_id;
  }

  // Create customer in Stripe
  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      pharmacy_id: pharmacyId,
    },
  });

  return customer.id;
};

/**
 * Create checkout session for subscription
 */
export const createCheckoutSession = async (
  pharmacyId: string,
  planId: string,
  billingInterval: 'monthly' | 'yearly',
  email: string,
  pharmacyName?: string,
  platform?: 'web' | 'mobile',
  buyingGroupId?: string | null
): Promise<{ sessionId: string; url: string }> => {
  // Get the plan
  const plan = await getSubscriptionPlanById(planId);

  // Get the appropriate price ID
  const priceId =
    billingInterval === 'monthly'
      ? plan.stripe_price_id_monthly
      : plan.stripe_price_id_yearly;

  if (!priceId) {
    throw new AppError(
      `Stripe price ID not configured for plan ${planId} (${billingInterval})`,
      400
    );
  }

  // Create or get Stripe customer
  const customerId = await createStripeCustomer(pharmacyId, email, pharmacyName);

  // Resolve the pharmacy portal URL from the buying group domain
  let baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const effectiveBuyingGroupId = buyingGroupId || await (async () => {
    if (!supabaseAdmin) return null;
    const { data: row } = await supabaseAdmin.from('pharmacy').select('buying_group_id').eq('id', pharmacyId).single();
    return row?.buying_group_id || null;
  })();
  if (effectiveBuyingGroupId) {
    const { getBuyingGroupHostnames } = await import('./tenantService');
    const hostnames = await getBuyingGroupHostnames(effectiveBuyingGroupId);
    if (hostnames?.pharmacyHostname) {
      baseUrl = `https://${hostnames.pharmacyHostname}`;
    }
  }

  // Determine success URL based on platform
  let successUrl: string;
  if (platform === 'mobile') {
    // React Native deep link URL format
    const mobileAppUrl = process.env.MOBILE_APP_DEEP_LINK_URL || 'pharmacyapp://home';
    successUrl = `${mobileAppUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`;
  } else {
    // Default web URL
    successUrl = `${baseUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: `${baseUrl}/subscription?canceled=true`,
    metadata: {
      pharmacy_id: pharmacyId,
      plan_id: planId,
      billing_interval: billingInterval,
      platform: platform || 'web',
    },
    subscription_data: {
      metadata: {
        pharmacy_id: pharmacyId,
        plan_id: planId,
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url || '',
  };
};

/**
 * Create portal session for managing subscription
 */
export const createPortalSession = async (
  pharmacyId: string,
  returnUrl: string
): Promise<{ url: string }> => {
  const subscription = await getPharmacySubscription(pharmacyId);

  if (!subscription?.stripe_customer_id) {
    throw new AppError('No active subscription found', 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
};

/**
 * Update subscription from Stripe webhook
 */
export const updateSubscriptionFromStripe = async (
  stripeSubscription: Stripe.Subscription
): Promise<void> => {
  // Use type alias to avoid conflict with local Subscription interface
  const sub: StripeSubscription = stripeSubscription;
  const pharmacyId = sub.metadata?.pharmacy_id;
  const planId = sub.metadata?.plan_id;

  if (!pharmacyId) {
    throw new AppError('Pharmacy ID not found in subscription metadata', 400);
  }

  // Get customer to find pharmacy email
  const customer = await stripe.customers.retrieve(sub.customer as string);
  const customerEmail = customer.deleted ? null : customer.email;

  // Get the latest invoice
  const latestInvoiceId =
    typeof sub.latest_invoice === 'string'
      ? sub.latest_invoice
      : sub.latest_invoice?.id || null;

  // Get payment method
  const defaultPaymentMethodId =
    typeof sub.default_payment_method === 'string'
      ? sub.default_payment_method
      : sub.default_payment_method?.id || null;

  let paymentMethod = null;
  if (defaultPaymentMethodId) {
    const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
    if (pm.type === 'card' && pm.card) {
      paymentMethod = {
        type: 'card',
        last4: pm.card.last4,
        brand: pm.card.brand,
        expiryMonth: pm.card.exp_month,
        expiryYear: pm.card.exp_year,
      };
    }
  }

  // Map Stripe status to our status
  let status = 'active';
  if (sub.status === 'trialing') {
    status = 'trial';
  } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
    status = 'past_due';
  } else if (sub.status === 'canceled') {
    status = 'cancelled';
  } else if (sub.status === 'incomplete' || sub.status === 'incomplete_expired') {
    status = 'expired';
  }

  // Get price details
  const priceId = sub.items.data[0]?.price.id;
  const priceAmount = sub.items.data[0]?.price.unit_amount || 0;
  const billingInterval =
    sub.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly';

  // Check if subscription exists
  const existingSubscription = await getPharmacySubscription(pharmacyId);

  const subscriptionData = {
    pharmacy_id: pharmacyId,
    plan: planId || existingSubscription?.plan || 'free',
    status,
    current_period_start: (sub as any).current_period_start
      ? new Date((sub as any).current_period_start * 1000).toISOString()
      : null,
    current_period_end: (sub as any).current_period_end
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end || false,
    payment_method: paymentMethod,
    price: priceAmount / 100, // Convert from cents
    billing_interval: billingInterval,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId || null,
    stripe_current_period_start: (sub as any).current_period_start
      ? new Date((sub as any).current_period_start * 1000).toISOString()
      : null,
    stripe_current_period_end: (sub as any).current_period_end
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null,
    stripe_cancel_at_period_end: sub.cancel_at_period_end || false,
    stripe_canceled_at: sub.canceled_at
      ? new Date(sub.canceled_at * 1000).toISOString()
      : null,
    stripe_ended_at: sub.ended_at
      ? new Date(sub.ended_at * 1000).toISOString()
      : null,
    stripe_latest_invoice_id: latestInvoiceId,
    stripe_payment_method_id: defaultPaymentMethodId,
    trial_start: sub.trial_start
      ? new Date(sub.trial_start * 1000).toISOString()
      : null,
    trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  if (existingSubscription) {
    // Update existing subscription
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id);

    if (error) {
      throw new AppError(`Failed to update subscription: ${error.message}`, 500);
    }
  } else {
    // Create new subscription
    const { error } = await supabaseAdmin.from('subscriptions').insert({
      ...subscriptionData,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new AppError(`Failed to create subscription: ${error.message}`, 500);
    }
  }

  // Update pharmacy table subscription status
  await supabaseAdmin
    .from('pharmacy')
    .update({
      subscription_tier: planId || 'free',
      subscription_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pharmacyId);
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (pharmacyId: string): Promise<void> => {
  const subscription = await getPharmacySubscription(pharmacyId);

  if (!subscription?.stripe_subscription_id) {
    throw new AppError('No active subscription found', 404);
  }

  // Cancel at period end in Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update local database
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      stripe_cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (error) {
    throw new AppError(`Failed to cancel subscription: ${error.message}`, 500);
  }
};

/**
 * Reactivate subscription
 */
export const reactivateSubscription = async (pharmacyId: string): Promise<void> => {
  const subscription = await getPharmacySubscription(pharmacyId);

  if (!subscription?.stripe_subscription_id) {
    throw new AppError('No active subscription found', 404);
  }

  // Reactivate in Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Update local database
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      stripe_cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (error) {
    throw new AppError(`Failed to reactivate subscription: ${error.message}`, 500);
  }
};

/**
 * Change subscription plan
 */
export const changeSubscriptionPlan = async (
  pharmacyId: string,
  newPlanId: string,
  billingInterval: 'monthly' | 'yearly'
): Promise<{ sessionId: string; url: string }> => {
  const subscription = await getPharmacySubscription(pharmacyId);

  if (!subscription?.stripe_subscription_id) {
    throw new AppError('No active subscription found', 404);
  }

  // Get the new plan
  const newPlan = await getSubscriptionPlanById(newPlanId);

  // Get the appropriate price ID
  const newPriceId =
    billingInterval === 'monthly'
      ? newPlan.stripe_price_id_monthly
      : newPlan.stripe_price_id_yearly;

  if (!newPriceId) {
    throw new AppError(
      `Stripe price ID not configured for plan ${newPlanId} (${billingInterval})`,
      400
    );
  }

  // Get current subscription from Stripe to find subscription item ID
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
  const subscriptionItemId = stripeSubscription.items.data[0]?.id;

  if (!subscriptionItemId) {
    throw new AppError('Subscription item not found', 404);
  }

  // Update subscription in Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    items: [
      {
        id: subscriptionItemId,
        price: newPriceId,
      },
    ],
    metadata: {
      pharmacy_id: pharmacyId,
      plan_id: newPlanId,
    },
    proration_behavior: 'always_invoice',
  });

  // The webhook will update the local database
  return {
    sessionId: '',
    url: '',
  };
};

