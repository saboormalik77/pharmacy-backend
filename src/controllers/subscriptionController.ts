import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import {
  getSubscriptionPlans,
  getSubscriptionPlanById,
  getPharmacySubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  changeSubscriptionPlan,
} from '../services/subscriptionService';
import { AppError } from '../utils/appError';

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all active subscription plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 */
export const getPlans = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const plans = await getSubscriptionPlans();

  res.status(200).json({
    status: 'success',
    data: plans,
  });
});

/**
 * @swagger
 * /api/subscriptions/plans/{planId}:
 *   get:
 *     summary: Get a single subscription plan by ID
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan details
 *       404:
 *         description: Plan not found
 */
export const getPlanById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { planId } = req.params;

  const plan = await getSubscriptionPlanById(planId);

  res.status(200).json({
    status: 'success',
    data: plan,
  });
});

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get current pharmacy subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 *       404:
 *         description: No subscription found
 */
export const getSubscription = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  const subscription = await getPharmacySubscription(pharmacyId);

  if (!subscription) {
    return res.status(200).json({
      status: 'success',
      data: null,
      message: 'No subscription found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: subscription,
  });
});

/**
 * @swagger
 * /api/subscriptions/checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - billingInterval
 *             properties:
 *               planId:
 *                 type: string
 *                 enum: [free, basic, premium, enterprise]
 *               billingInterval:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               platform:
 *                 type: string
 *                 enum: [web, mobile]
 *                 description: Platform type - 'web' for web redirect, 'mobile' for React Native app deep link
 *                 example: mobile
 *     responses:
 *       200:
 *         description: Checkout session created
 */
export const createCheckout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  const { planId, billingInterval, platform } = req.body;

  if (!planId || !billingInterval) {
    return next(new AppError('planId and billingInterval are required', 400));
  }

  if (!['monthly', 'yearly'].includes(billingInterval)) {
    return next(new AppError('billingInterval must be "monthly" or "yearly"', 400));
  }

  // Validate platform if provided
  if (platform && !['web', 'mobile'].includes(platform)) {
    return next(new AppError('platform must be "web" or "mobile"', 400));
  }

  // Get pharmacy email
  const { supabaseAdmin } = await import('../config/supabase');
  const { data: pharmacy, error } = await supabaseAdmin!
    .from('pharmacy')
    .select('email, name, pharmacy_name')
    .eq('id', pharmacyId)
    .single();

  if (error || !pharmacy) {
    return next(new AppError('Pharmacy not found', 404));
  }

  const result = await createCheckoutSession(
    pharmacyId,
    planId,
    billingInterval,
    pharmacy.email,
    pharmacy.pharmacy_name || pharmacy.name,
    platform
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @swagger
 * /api/subscriptions/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - returnUrl
 *             properties:
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Portal session created
 */
export const createPortal = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  const { returnUrl } = req.body;

  if (!returnUrl) {
    return next(new AppError('returnUrl is required', 400));
  }

  const result = await createPortalSession(pharmacyId, returnUrl);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     summary: Cancel subscription (at period end)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription canceled
 */
export const cancel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  await cancelSubscription(pharmacyId);

  res.status(200).json({
    status: 'success',
    message: 'Subscription will be canceled at the end of the billing period',
  });
});

/**
 * @swagger
 * /api/subscriptions/reactivate:
 *   post:
 *     summary: Reactivate canceled subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription reactivated
 */
export const reactivate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  await reactivateSubscription(pharmacyId);

  res.status(200).json({
    status: 'success',
    message: 'Subscription reactivated',
  });
});

/**
 * @swagger
 * /api/subscriptions/change-plan:
 *   post:
 *     summary: Change subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - billingInterval
 *             properties:
 *               planId:
 *                 type: string
 *                 enum: [free, basic, premium, enterprise]
 *               billingInterval:
 *                 type: string
 *                 enum: [monthly, yearly]
 *     responses:
 *       200:
 *         description: Plan changed successfully
 */
export const changePlan = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  const { planId, billingInterval } = req.body;

  if (!planId || !billingInterval) {
    return next(new AppError('planId and billingInterval are required', 400));
  }

  if (!['monthly', 'yearly'].includes(billingInterval)) {
    return next(new AppError('billingInterval must be "monthly" or "yearly"', 400));
  }

  await changeSubscriptionPlan(pharmacyId, planId, billingInterval);

  res.status(200).json({
    status: 'success',
    message: 'Subscription plan changed successfully',
  });
});

