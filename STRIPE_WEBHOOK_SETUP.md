# Stripe Webhook Setup Guide

This guide will help you set up Stripe webhooks for marketplace checkout payments.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your backend server running (default: `http://localhost:3000`)
3. ngrok installed (for localhost development)

---

## Step 1: Install ngrok (for Local Development)

### Option A: Using npm (Recommended)
```bash
npm install -g ngrok
```

### Option B: Using Homebrew (Mac)
```bash
brew install ngrok
```

### Option C: Download from website
1. Go to https://ngrok.com/download
2. Download for your OS
3. Extract and add to PATH

---

## Step 2: Start Your Backend Server

Make sure your backend is running:

```bash
cd /home/saboor.malik@2bvision.com/2bvt/pharmacy-backend
npm run dev
```

Your server should be running on `http://localhost:3000` (or the port specified in your `.env.local`)

---

## Step 3: Expose Your Server with ngrok

Open a **new terminal window** and run:

```bash
ngrok http 3000
```

**Important:** Keep this terminal open! ngrok must stay running.

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`) - you'll need this for Stripe.

---

## Step 4: Configure Stripe Webhook

### 4.1 Go to Stripe Dashboard

1. Log in to https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle in top right)
3. Go to **Developers** → **Webhooks** in the left sidebar

### 4.2 Add Webhook Endpoint

1. Click **"Add endpoint"** button
2. Enter your webhook URL:
   ```
   https://your-ngrok-url.ngrok.io/api/subscriptions/webhook
   ```
   Replace `your-ngrok-url.ngrok.io` with your actual ngrok URL from Step 3

3. **Description** (optional): `Pharmacy Marketplace & Subscriptions`

### 4.3 Select Events to Listen To

Click **"Select events"** and check these events:

#### For Marketplace Checkout:
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`

#### For Subscriptions (if you have them):
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

4. Click **"Add endpoint"**

### 4.4 Get Webhook Signing Secret

After creating the endpoint:

1. Click on your newly created webhook endpoint
2. Find **"Signing secret"** section
3. Click **"Reveal"** or **"Click to reveal"**
4. **Copy the signing secret** (starts with `whsec_...`)

---

## Step 5: Add Webhook Secret to Environment Variables

### Backend `.env.local`

Add or update this line in your backend `.env.local` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Important:** 
- Replace `whsec_your_webhook_secret_here` with the actual secret from Step 4.4
- Never commit this file to git (it should be in `.gitignore`)

### Restart Your Backend Server

After adding the webhook secret, restart your backend:

```bash
# Stop the server (Ctrl+C)
# Then start again
npm run dev
```

---

## Step 6: Test the Webhook

### 6.1 Test with Stripe CLI (Recommended)

Install Stripe CLI:
```bash
# Mac
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

Login to Stripe:
```bash
stripe login
```

Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

This will give you a webhook signing secret. Use this for local testing instead of the one from Stripe Dashboard.

### 6.2 Test with Real Checkout

1. Go to your frontend marketplace
2. Add items to cart
3. Go to checkout
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete the payment
6. Check your backend logs - you should see webhook events being processed
7. Check your database - order status should change from `pending` to `paid`

---

## Step 7: Verify Webhook is Working

### Check Backend Logs

When a payment is completed, you should see in your backend console:

```
Processing marketplace payment for session: cs_test_...
Order payment updated
```

### Check Database

Query your `marketplace_orders` table:

```sql
SELECT 
  order_number,
  status,
  stripe_payment_status,
  paid_at,
  created_at
FROM marketplace_orders
ORDER BY created_at DESC
LIMIT 5;
```

The `status` should be `paid` and `paid_at` should have a timestamp.

### Check Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View **"Recent events"** tab
4. You should see `checkout.session.completed` events with status `200 OK`

---

## Troubleshooting

### Webhook Not Receiving Events

1. **Check ngrok is running**: Make sure the ngrok terminal is still open
2. **Check webhook URL**: Verify the URL in Stripe matches your ngrok URL
3. **Check server is running**: Make sure backend is running on the correct port
4. **Check firewall**: Make sure port 3000 is accessible

### Webhook Returns 400/500 Errors

1. **Check webhook secret**: Verify `STRIPE_WEBHOOK_SECRET` in `.env.local` matches Stripe Dashboard
2. **Check backend logs**: Look for error messages
3. **Check database connection**: Make sure Supabase connection is working
4. **Check RPC functions**: Make sure `update_marketplace_order_payment` function exists in database

### Order Status Stays "pending"

1. **Webhook not configured**: Follow steps above to set up webhook
2. **Webhook secret wrong**: Check `STRIPE_WEBHOOK_SECRET` in `.env.local`
3. **Webhook endpoint wrong**: Verify URL in Stripe Dashboard
4. **Events not selected**: Make sure `checkout.session.completed` is selected
5. **Check webhook logs**: View events in Stripe Dashboard to see if they're being sent

### ngrok URL Changes

**Important:** Free ngrok URLs change every time you restart ngrok!

If your ngrok URL changes:
1. Update the webhook URL in Stripe Dashboard
2. Or use ngrok's static domain (requires paid plan)

---

## Production Setup

For production, you don't need ngrok. Instead:

1. Deploy your backend to a server (Vercel, AWS, etc.)
2. Get your production URL (e.g., `https://api.yourdomain.com`)
3. Create a new webhook endpoint in Stripe Dashboard:
   ```
   https://api.yourdomain.com/api/subscriptions/webhook
   ```
4. Use **Live mode** webhook secret (different from test mode)
5. Add `STRIPE_WEBHOOK_SECRET` to your production environment variables

---

## Quick Reference

### Webhook Endpoint URL
```
https://your-ngrok-url.ngrok.io/api/subscriptions/webhook
```

### Required Events
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Environment Variable
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Card
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

---

## Support

If you encounter issues:

1. Check Stripe Dashboard → Webhooks → Recent events for error details
2. Check backend logs for error messages
3. Verify all environment variables are set correctly
4. Make sure database RPC functions are created and working

For Stripe-specific issues:
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Support](https://support.stripe.com)

