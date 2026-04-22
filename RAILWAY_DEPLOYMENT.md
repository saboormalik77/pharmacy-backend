# Railway Deployment Guide

## Quick Deploy

1. **Push to GitHub** (Railway pulls from your repo)
2. **Create Railway project** at [railway.app](https://railway.app)
3. **Connect repo** → select `pharmacy-backend`
4. **Add environment variables** (see below)
5. Deploy automatically triggers on push

---

## Environment Variables (Required)

Set these in Railway dashboard → Variables:

```env
# Node
NODE_ENV=production
PORT=3000

# Supabase (production project)
SUPABASE_URL=https://mxdzmfgkjktbvjeonwiq.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# JWT
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=24h

# Backend URL (Railway gives you a domain like xxx.up.railway.app)
BACKEND_URL=https://<your-railway-domain>.up.railway.app

# Frontend URLs (update to your deployed frontends)
FRONTEND_URL=https://your-pharmacy-frontend.com
ADMIN_URL=https://your-admin-frontend.com
ADMIN_PASSWORD_RESET_REDIRECT_URL=https://your-admin-frontend.com/reset-password

# FedEx (if using)
FEDEX_API_KEY=<your-fedex-api-key>
FEDEX_SECRET_KEY=<your-fedex-secret>
FEDEX_ACCOUNT_NUMBER=<your-fedex-account>

# Resend (email)
RESEND_API_KEY=<your-resend-key>

# Stripe (if using)
STRIPE_SECRET_KEY=<your-stripe-secret>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# OpenAI (if using)
OPENAI_API_KEY=<your-openai-key>

# Puppeteer (for PDF generation)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

---

## After Deployment

### Update Supabase URL Configuration

Once Railway gives you your domain (e.g. `pharmacy-backend-xxx.up.railway.app`), update Supabase:

**Site URL:**
```
https://pharmacy-backend-xxx.up.railway.app
```

**Redirect URLs (add):**
```
https://pharmacy-backend-xxx.up.railway.app/api/auth/callback**
```

---

## Files Created

| File | Purpose |
|------|---------|
| `railway.json` | Railway build/deploy config |
| `nixpacks.toml` | System dependencies (canvas, puppeteer) |
| `Procfile` | Start command fallback |
| `.railwayignore` | Exclude frontend apps from deploy |

---

## Troubleshooting

### Build fails on canvas/puppeteer
The `nixpacks.toml` includes required native deps. If issues persist, check Railway build logs.

### Health check fails
Your root route returns `{"status":"ok",...}` which Railway expects. If health checks timeout, increase `healthcheckTimeout` in `railway.json`.

### Environment variable missing
Railway logs will show `undefined` errors. Double-check all required vars are set.

---

## Local Test of Production Build

```bash
yarn build
NODE_ENV=production node dist/server.js
```
