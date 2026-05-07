import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { updateSubscriptionFromStripe } from '../services/subscriptionService';
import { handlePaymentSuccess } from '../services/marketplaceCheckoutService';
import { AppError } from '../utils/appError';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover' as any,
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification will be disabled.');
}

/**
 * Handle Stripe webhook events
 * @swagger
 * /api/subscriptions/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
export const handleWebhook = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return next(new AppError('Missing stripe-signature header', 400));
  }

  if (!stripe) {
    return next(new AppError('Stripe is not configured', 500));
  }

  if (!webhookSecret) {
    // In development, you might want to skip verification
    // In production, always verify webhooks
    console.warn('Processing webhook without signature verification (STRIPE_WEBHOOK_SECRET not set)');
    
    // For development, parse the event directly
    const event = req.body;
    await processWebhookEvent(event);
    return res.status(200).json({ received: true });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return next(new AppError(`Webhook Error: ${err.message}`, 400));
  }

  await processWebhookEvent(event);

  res.status(200).json({ received: true });
});

/**
 * Process Stripe webhook event
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Handle subscription checkout
      if (session.mode === 'subscription' && session.subscription && stripe) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
          { expand: ['default_payment_method'] }
        );
        await updateSubscriptionFromStripe(subscription);
      }
      
      // Handle marketplace one-time payment checkout
      if (session.mode === 'payment' && session.metadata?.type === 'marketplace_order') {
        console.log('Processing marketplace payment for session:', session.id);
        
        // Get payment intent details
        let paymentMethodDetails: { type?: string; last4?: string; brand?: string } = {};
        let receiptUrl: string | undefined;
        
        if (session.payment_intent && stripe) {
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent.id;
            
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['payment_method', 'latest_charge'],
          });
          
          // Get payment method details
          if (paymentIntent.payment_method && typeof paymentIntent.payment_method !== 'string') {
            const pm = paymentIntent.payment_method;
            if (pm.type === 'card' && pm.card) {
              paymentMethodDetails = {
                type: 'card',
                last4: pm.card.last4,
                brand: pm.card.brand,
              };
            }
          }
          
          // Get receipt URL from charge
          if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge !== 'string') {
            receiptUrl = paymentIntent.latest_charge.receipt_url || undefined;
          }
          
          // Update marketplace order
          await handlePaymentSuccess(
            session.id,
            paymentIntentId,
            session.payment_status || 'paid',
            paymentMethodDetails,
            receiptUrl
          );
        }
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Check if this is a marketplace order payment
      if (paymentIntent.metadata?.type === 'marketplace_order') {
        console.log('Payment intent succeeded for marketplace order:', paymentIntent.id);
        // The checkout.session.completed event handles the main update
        // This is a backup in case the session event doesn't fire
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Handle failed marketplace payment
      if (paymentIntent.metadata?.type === 'marketplace_order') {
        console.log('Payment failed for marketplace order:', paymentIntent.id);
        // Could update order status to failed here if needed
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionFromStripe(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionFromStripe(subscription);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      // Invoice has subscription property but TypeScript types may not include it
      const subscriptionId = (invoice as any).subscription as string | Stripe.Subscription | null;
      if (subscriptionId && stripe) {
        const subscription = typeof subscriptionId === 'string'
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : subscriptionId;
        await updateSubscriptionFromStripe(subscription);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Invoice has subscription property but TypeScript types may not include it
      const subscriptionId = (invoice as any).subscription as string | Stripe.Subscription | null;
      if (subscriptionId && stripe) {
        const subscription = typeof subscriptionId === 'string'
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : subscriptionId;
        await updateSubscriptionFromStripe(subscription);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

