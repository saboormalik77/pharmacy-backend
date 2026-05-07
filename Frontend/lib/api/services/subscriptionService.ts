/**
 * Subscription Service
 * Handles all subscription-related API calls
 */

import { apiClient } from '../client';
import type { Subscription, SubscriptionPlanDetails } from '@/types';

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

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

/**
 * Get all active subscription plans
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiClient.get<SubscriptionPlan[]>('/subscriptions/plans', {}, false);
  return response.data || [];
};

/**
 * Get a single subscription plan by ID
 */
export const getSubscriptionPlanById = async (planId: string): Promise<SubscriptionPlan> => {
  const response = await apiClient.get<SubscriptionPlan>(`/subscriptions/plans/${planId}`, {}, false);
  if (!response.data) {
    throw new Error('Plan not found');
  }
  return response.data;
};

/**
 * Get current pharmacy subscription
 */
export const getSubscription = async (): Promise<Subscription | null> => {
  const response = await apiClient.get<Subscription>('/subscriptions');
  return response.data || null;
};

/**
 * Create Stripe checkout session
 */
export const createCheckoutSession = async (
  planId: string,
  billingInterval: 'monthly' | 'yearly'
): Promise<CheckoutSessionResponse> => {
  const response = await apiClient.post<CheckoutSessionResponse>('/subscriptions/checkout', {
    planId,
    billingInterval,
  });
  if (!response.data) {
    throw new Error('Failed to create checkout session');
  }
  return response.data;
};

/**
 * Create Stripe customer portal session
 */
export const createPortalSession = async (returnUrl: string): Promise<PortalSessionResponse> => {
  const response = await apiClient.post<PortalSessionResponse>('/subscriptions/portal', {
    returnUrl,
  });
  if (!response.data) {
    throw new Error('Failed to create portal session');
  }
  return response.data;
};

/**
 * Cancel subscription (at period end)
 */
export const cancelSubscription = async (): Promise<void> => {
  await apiClient.post('/subscriptions/cancel', {});
};

/**
 * Reactivate canceled subscription
 */
export const reactivateSubscription = async (): Promise<void> => {
  await apiClient.post('/subscriptions/reactivate', {});
};

/**
 * Change subscription plan
 */
export const changeSubscriptionPlan = async (
  planId: string,
  billingInterval: 'monthly' | 'yearly'
): Promise<void> => {
  await apiClient.post('/subscriptions/change-plan', {
    planId,
    billingInterval,
  });
};

