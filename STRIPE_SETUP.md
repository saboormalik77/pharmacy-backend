# Stripe Subscription Setup Guide

This guide will help you set up Stripe for subscription management in the pharmacy backend.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Supabase database
3. Backend and frontend environment variables configured

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_test_` for test mode or `pk_live_` for production)
3. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)
4. For webhooks, you'll need a **Webhook signing secret** (we'll get this in Step 4)

## Step 2: Configure Environment Variables

### Backend (.env.local)

Add these to your backend `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FRONTEND_URL=http://localhost:3001
```

### Frontend (.env.local)

Add this to your frontend `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Note:** The frontend doesn't actually need the Stripe publishable key for this implementation since we're using Stripe Checkout (hosted by Stripe), but it's good to have it available if you want to add Stripe Elements later.

## Step 3: Create Database Tables

Run the SQL script to create the subscription tables:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the script: `scripts/subscription_tables.sql`

This will create:
- `subscription_plans` table
- Update `subscriptions` table with Stripe fields

## Step 4: Create Products and Prices in Stripe

1. Go to https://dashboard.stripe.com/products
2. Click "Add product" for each plan:

### Free Plan
- **Name:** Free
- **Description:** Perfect for getting started with basic features
- **Pricing:** $0/month (recurring, monthly)
- **Pricing:** $0/year (recurring, yearly)
- Copy the **Product ID** and **Price IDs**

### Basic Plan
- **Name:** Basic
- **Description:** For small pharmacies with moderate needs
- **Pricing:** $49/month (recurring, monthly)
- **Pricing:** $490/year (recurring, yearly) - ~17% discount
- Copy the **Product ID** and **Price IDs**
prod_TTw34EodsCIshi
price_1SWyBCAI9jOPJ9MLK3YGkA7E

### Premium Plan
- **Name:** Premium
- **Description:** For growing pharmacies with advanced needs
- **Pricing:** $99/month (recurring, monthly)
- **Pricing:** $990/year (recurring, yearly) - ~17% discount
- Copy the **Product ID** and **Price IDs**

prod_TTw34EodsCIshi
price_1SWyBCAI9jOPJ9MLK3YGkA7E

prod_TTw7VJBAf2PcsM
price_1SWyFBAI9jOPJ9MLeb85uEAM

### Enterprise Plan
- **Name:** Enterprise
- **Description:** For large pharmacies with custom requirements
- **Pricing:** $299/month (recurring, monthly)
- **Pricing:** $2990/year (recurring, yearly) - ~17% discount
- Copy the **Product ID** and **Price IDs**



## Step 5: Insert Plans into Database

1. Open the script: `scripts/insert_subscription_plans.sql`
2. For each plan, replace the `NULL` values with the Stripe IDs you copied:
   - `stripe_product_id` - The Product ID from Stripe
   - `stripe_price_id_monthly` - The monthly Price ID from Stripe
   - `stripe_price_id_yearly` - The yearly Price ID from Stripe
3. Run the updated script in Supabase SQL Editor

Example:
```sql
INSERT INTO subscription_plans (
  id, 
  name,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  ...
) VALUES (
  'basic',
  'Basic',
  'prod_ABC123',  -- Replace with your Product ID
  'price_XYZ789', -- Replace with your monthly Price ID
  'price_DEF456', -- Replace with your yearly Price ID
  ...
);
```

## Step 6: Set Up Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-backend-domain.com/api/subscriptions/webhook`
   - For local development, use a tool like [ngrok](https://ngrok.com) to expose your local server:
     ```bash
     ngrok http 3000
     ```
     Then use: `https://your-ngrok-url.ngrok.io/api/subscriptions/webhook`
4. Select these events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your backend `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Step 7: Test the Integration

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. Start your frontend server:
   ```bash
   cd Frontend
   npm run dev
   ```

3. Navigate to `/subscription` page
4. Try selecting a plan (use Stripe test card: `4242 4242 4242 4242`)
5. Complete the checkout flow
6. Verify the subscription is created in:
   - Stripe Dashboard
   - Your database (`subscriptions` table)
   - The frontend subscription page

## Test Cards

Use these test cards in Stripe test mode:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires authentication:** `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Troubleshooting

### Webhook not receiving events
- Verify the webhook URL is accessible
- Check that `STRIPE_WEBHOOK_SECRET` is set correctly
- Look at webhook logs in Stripe Dashboard
- Check backend logs for errors

### Subscription not updating in database
- Verify webhook is receiving events (check Stripe Dashboard)
- Check backend logs for webhook processing errors
- Ensure `STRIPE_SECRET_KEY` is set correctly

### Checkout session not creating
- Verify `STRIPE_SECRET_KEY` is set in backend
- Check that plan has `stripe_price_id_monthly` or `stripe_price_id_yearly` set
- Check backend logs for errors

## Production Checklist

Before going to production:

- [ ] Switch to Stripe live mode
- [ ] Update all environment variables with live keys
- [ ] Update webhook endpoint to production URL
- [ ] Test with real payment methods (small amount)
- [ ] Set up monitoring for webhook failures
- [ ] Configure email notifications in Stripe
- [ ] Set up proper error handling and logging

## Support

For Stripe-specific issues, refer to:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Support](https://support.stripe.com)

