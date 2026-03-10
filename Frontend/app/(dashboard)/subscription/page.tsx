"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  CreditCard, 
  CheckCircle2,
  Mail,
  Globe,
  Settings,
  Crown,
  Zap,
  Building2,
  Loader2,
} from 'lucide-react';
import { 
  getSubscriptionPlans, 
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  type SubscriptionPlan,
} from '@/lib/api/services';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { Subscription } from '@/types';

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null); // Track which plan is being processed
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      const subscriptionData = await getSubscription();
      setSubscription(subscriptionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription');
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.all([
        getSubscriptionPlans(),
        getSubscription(),
      ]);
      setPlans(plansData);
      setSubscription(subscriptionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    const success = searchParams?.get('success');
    const canceled = searchParams?.get('canceled');
    
    if (success) {
      // Reload subscription data
      loadSubscription();
    } else if (canceled) {
      setError('Payment was canceled. Please try again.');
    }
  }, [searchParams, loadSubscription]);

  // Load plans and subscription
  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (processing) return;
    
    try {
      setProcessing(planId); // Set the specific plan ID being processed
      setError(null);
      
      const result = await createCheckoutSession(planId, billingInterval);
      
      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to create checkout session');
        setProcessing(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setProcessing(null);
    }
  };

  const handleManageBilling = async () => {
    if (processing) return;
    
    try {
      setProcessing('billing'); // Use special identifier for billing operations
      setError(null);
      
      const returnUrl = `${window.location.origin}/subscription`;
      const result = await createPortalSession(returnUrl);
      
      // Redirect to Stripe Customer Portal
      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to create portal session');
        setProcessing(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
      setProcessing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
      return;
    }

    if (processing) return;
    
    try {
      setProcessing('cancel'); // Use special identifier for cancel operations
      setError(null);
      
      await cancelSubscription();
      await loadSubscription();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(null);
    }
  };

  const handleReactivateSubscription = async () => {
    if (processing) return;
    
    try {
      setProcessing('reactivate'); // Use special identifier for reactivate operations
      setError(null);
      
      await reactivateSubscription();
      await loadSubscription();
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate subscription');
    } finally {
      setProcessing(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return Zap;
      case 'basic': return Settings;
      case 'premium': return Crown;
      case 'enterprise': return Building2;
      default: return CreditCard;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free': return 'border-gray-200 bg-gray-50';
      case 'basic': return 'border-blue-200 bg-blue-50';
      case 'premium': return 'border-teal-200 bg-teal-50';
      case 'enterprise': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriceForPlan = (plan: SubscriptionPlan) => {
    return billingInterval === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const currentPlanId = subscription?.plan || 'free';
  const currentPlan = plans.find(p => p.id === currentPlanId);

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Subscription & Billing</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Manage your subscription and payment methods</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-600 break-words">{error}</p>
          </div>
        )}

        {/* Current Subscription */}
        {loading ? (
          <Card className="border-2 border-teal-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            </CardContent>
          </Card>
        ) : subscription && currentPlan ? (
          <Card className="border-2 border-teal-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Current Plan</CardTitle>
                  <CardDescription>
                    {subscription.status === 'active' ? 'Active subscription' : 'Subscription status'}
                  </CardDescription>
                </div>
                <Badge variant={subscription.status === 'active' ? 'success' : 'warning'}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className={`p-3 sm:p-4 rounded-lg ${getPlanColor(currentPlan.id)} flex-shrink-0 self-start sm:self-auto`}>
                    {(() => {
                      const Icon = getPlanIcon(currentPlan.id);
                      return <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold">{currentPlan.name} Plan</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {subscription.price ? formatCurrency(subscription.price) : 'Free'}/{subscription.billingInterval === 'monthly' ? 'month' : 'year'}
                    </p>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-600">Next billing date</p>
                      <p className="text-sm font-semibold">{formatDate(subscription.currentPeriodEnd)}</p>
                    </div>
                  )}
                </div>

                {/* Plan Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Plan Features</p>
                    <ul className="space-y-1">
                      {currentPlan.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Limits</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Documents:</span>
                        <span className="font-medium">
                          {currentPlan.max_documents === null ? 'Unlimited' : currentPlan.max_documents}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distributors:</span>
                        <span className="font-medium">
                          {currentPlan.max_distributors === null ? 'Unlimited' : currentPlan.max_distributors}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Support:</span>
                        <span className="font-medium capitalize">{currentPlan.support_level}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                {subscription.paymentMethod && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <CreditCard className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
                          </p>
                          <p className="text-xs text-gray-600">
                            Expires {subscription.paymentMethod.expiryMonth}/{subscription.paymentMethod.expiryYear}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManageBilling}
                        disabled={processing !== null}
                        className="w-full sm:w-auto"
                      >
                        {processing === 'billing' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleManageBilling}
                    disabled={processing !== null}
                  >
                    {processing === 'billing' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    <span className="hidden sm:inline">Manage Billing</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                  {subscription.cancelAtPeriodEnd ? (
                    <Button 
                      variant="outline" 
                      className="flex-1 text-green-600 border-green-300"
                      onClick={handleReactivateSubscription}
                      disabled={processing !== null}
                    >
                      {processing === 'reactivate' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      <span className="hidden sm:inline">Reactivate Subscription</span>
                      <span className="sm:hidden">Reactivate</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="flex-1 text-red-600 border-red-300"
                      onClick={handleCancelSubscription}
                      disabled={processing !== null}
                    >
                      {processing === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      <span className="hidden sm:inline">Cancel Subscription</span>
                      <span className="sm:hidden">Cancel</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Available Plans */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Available Plans</h2>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
                  billingInterval === 'monthly'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
                  billingInterval === 'yearly'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-2 border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {plans.map((plan) => {
                const Icon = getPlanIcon(plan.id);
                const isCurrentPlan = plan.id === currentPlanId;
                const price = getPriceForPlan(plan);
                
                return (
                  <Card
                    key={plan.id}
                    className={`border-2 ${
                      isCurrentPlan
                        ? 'border-teal-500 bg-teal-50'
                        : getPlanColor(plan.id)
                    }`}
                  >
                  <CardHeader>
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        isCurrentPlan ? 'bg-teal-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${
                          isCurrentPlan ? 'text-teal-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base">{plan.name}</CardTitle>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {price === 0 ? 'Free' : formatCurrency(price)}
                          {price > 0 && <span className="text-xs sm:text-sm font-normal text-gray-600">/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>}
                        </p>
                      </div>
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="success" className="text-xs">Current Plan</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full text-sm sm:text-base rounded-lg ${
                        isCurrentPlan
                          ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                      disabled={isCurrentPlan || processing !== null}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {processing === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="hidden sm:inline">Processing...</span>
                          <span className="sm:hidden">Processing</span>
                        </>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : (
                        'Select Plan'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </div>

        {/* Integration Settings */}
        {/* <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Integration Settings</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Configure automatic data collection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Email Integration</p>
                  <p className="text-xs text-gray-600">Forward emails from reverse distributors</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Configure
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Portal Auto-Fetch</p>
                  <p className="text-xs text-gray-600">Automatically fetch from distributor portals</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <span className="hidden sm:inline">Manage Credentials</span>
                <span className="sm:hidden">Manage</span>
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </DashboardLayout>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    }>
      <SubscriptionContent />
    </Suspense>
  );
}
