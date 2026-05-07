# Nodemailer Email Integration — Deployment Guide

## Architecture Overview

The email system uses **Nodemailer with SMTP** for all email sending. Two deployment paths exist:

| Path | Runtime | When to use |
|------|---------|-------------|
| **Node.js backend** (primary) | Express server | RA requests, reminders, test emails — runs automatically when the backend is up |
| **Supabase Edge Function** (optional) | Deno | Standalone email sending, can be invoked via Supabase client or HTTP — useful for serverless/edge deployments |

Both paths use the same SMTP credentials and produce identical HTML emails.

---

## 1. SMTP Provider Setup

You need an SMTP server. Common options:

### Gmail (easiest for testing)
1. Enable 2-Step Verification on your Google account.
2. Go to [App Passwords](https://myaccount.google.com/apppasswords).
3. Create a new app password (select "Mail" → "Other (Custom name)" → "FCR Returns").
4. Copy the generated 16-character password.

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # the app password
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Outlook / Office 365
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
```

### SendGrid SMTP Relay
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxx  # your SendGrid API key
SMTP_FROM_EMAIL=verified-sender@yourdomain.com
```

### AWS SES SMTP
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SMTP_FROM_EMAIL=verified-email@yourdomain.com
```

---

## 2. Environment Variables

### Backend (.env.local)

Add these to your `.env.local`:

```bash
# ── SMTP Configuration (required) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Returns Department

# ── Email metadata ──
REPLY_TO_EMAIL=returns@your-company.com
CONTACT_NAME=Returns Department
CONTACT_EMAIL=returns@your-company.com
CONTACT_PHONE=+1-555-0123
```

### Supabase Edge Function Secrets (only if deploying the Edge Function)

```bash
supabase secrets set \
  SMTP_HOST=smtp.gmail.com \
  SMTP_PORT=587 \
  SMTP_SECURE=false \
  SMTP_USER=your-email@gmail.com \
  SMTP_PASS=your-app-password \
  SMTP_FROM_EMAIL=your-email@gmail.com \
  SMTP_FROM_NAME="Returns Department" \
  REPLY_TO_EMAIL=returns@your-company.com
```

---

## 3. Database Migration

Run the SQL scripts **in order** in the Supabase SQL Editor:

1. `scripts/fcr_20_email_integration.sql` — Creates `email_logs` table, `get_email_stats` RPC, etc.
2. `scripts/fcr_21_nodemailer_migration.sql` — Renames `resend_email_id` → `smtp_message_id` and updates related functions.

> If you already ran `fcr_20_email_integration.sql` previously, just run `fcr_21_nodemailer_migration.sql`.

---

## 4. Deploy the Edge Function (Optional)

The Edge Function at `supabase/functions/send-email/index.ts` can be deployed manually:

```bash
# Login to Supabase CLI (one-time)
supabase login

# Link to your project (one-time)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-email --no-verify-jwt

# Set the secrets (see section 2 above)
supabase secrets set SMTP_HOST=... SMTP_PORT=587 ...
```

### Test the Edge Function

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "to": "test@example.com",
    "templateType": "ra-request",
    "templateData": {
      "memoNumber": "TEST-001",
      "pharmacyName": "Test Pharmacy",
      "destination": "Test Destination",
      "labelerName": "Test Manufacturer",
      "totalItems": 2,
      "totalAskValue": 500.00,
      "items": [
        { "ndc": "12345-678-90", "productName": "Test Drug", "quantity": 1, "askPrice": 500.00 }
      ]
    },
    "recipientName": "John Doe"
  }'
```

---

## 5. Testing the Backend

### Start the server

```bash
npm run dev
```

### Send a test email via the API

```bash
# Get an admin auth token first (login via the admin UI or API)
TOKEN="your-admin-jwt-token"

curl -X POST http://localhost:3000/api/admin/emails/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"to": "your-email@example.com", "templateType": "ra-request"}'
```

### Check email stats

```bash
curl http://localhost:3000/api/admin/emails/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Check email health

```bash
curl http://localhost:3000/api/admin/emails/health \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Frontend Testing

The admin frontend has a full Email Management UI:

1. Navigate to **Email Management** in the admin sidebar.
2. Go to the **Test Email** tab.
3. Enter a recipient email address.
4. Select a template type (RA Request or RA Reminder).
5. Click **Send Test Email**.

You can also test the full RA flow:
1. Navigate to **Debit Memos** → select a memo.
2. Click **Request RA** — this sends a real email via SMTP.
3. Check the **Email Logs** tab in Email Management to verify.

---

## 7. How It Works

### Email Flow (RA Request)

```
Admin clicks "Request RA" on a debit memo
    ↓
raService.sendRARequest()
    ↓
1. Calls RPC ra_send_request → creates ra_requests record
2. Calls RPC ra_generate_request_email → gets template data
3. Calls nodemailerService.sendRARequestEmail()
    ↓
nodemailer connects to SMTP server → sends email
    ↓
4. Calls RPC ra_update_request_status → logs to email_logs
```

### Email Flow (Reminder)

```
Admin clicks "Resend RA" on a debit memo
    ↓
raService.resendRARequest()
    ↓
1. Calls RPC ra_resend_request → creates resend record
2. Calls RPC ra_generate_reminder_email → gets template data
3. Calls nodemailerService.sendRAReminderEmail()
    ↓
nodemailer connects to SMTP server → sends email
    ↓
4. Calls RPC ra_update_request_status → logs to email_logs
```

---

## 8. Files Changed / Created

| File | Description |
|------|-------------|
| `src/services/nodemailerService.ts` | Core SMTP email service — transporter, RA request/reminder templates, test email |
| `src/services/raService.ts` | Updated to use nodemailerService (removed Resend/Edge Function) |
| `src/controllers/emailManagementController.ts` | Test email handler now uses nodemailerService |
| `supabase/functions/send-email/index.ts` | NEW Edge Function — standalone email sending via SMTP |
| `scripts/fcr_21_nodemailer_migration.sql` | DB migration: renames resend columns → smtp columns |
| `NODEMAILER_DEPLOYMENT_GUIDE.md` | This file |

---

## 9. Troubleshooting

### "SMTP not configured" error
Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM_EMAIL` in `.env.local`.

### Gmail: "Less secure app access" / "Username and Password not accepted"
Use an [App Password](https://myaccount.google.com/apppasswords) instead of your regular password. 2-Step Verification must be enabled.

### Emails going to spam
- Use a verified sending domain (SPF + DKIM + DMARC records).
- Avoid using free email addresses as the sender for production.
- Consider using a dedicated email service (SendGrid, SES) for production.

### Edge Function: "npm:nodemailer" errors
If the Edge Function fails due to Deno npm compatibility issues, the Node.js backend is the primary and reliable path. The Edge Function is optional.

### Connection timeout
Check that your SMTP port (587 for TLS, 465 for SSL) is not blocked by firewalls or hosting provider restrictions.
