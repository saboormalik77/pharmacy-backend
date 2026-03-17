# How to Test the Email Integration

## Prerequisites

- `.env.local` has been updated with:
  - `RESEND_API_KEY=re_...`
  - `FROM_EMAIL=onboarding@resend.dev`
  - `REPLY_TO_EMAIL=your-email@example.com` (optional)

## 1. Start the backend

```bash
npm run dev
```

Leave it running (default port 3000).

---

## 2. Get an admin token

- Log in to your **admin app** (e.g. http://localhost:3002 or your admin URL).
- Open DevTools → **Application** (or **Storage**) → find the token,  
  **or** use the **Network** tab when logging in and copy the `Authorization` header value.
- You need the **Bearer token** (the long string after `Bearer `).

---

## 3. Send a test email (no DB required)

Replace `YOUR_ADMIN_TOKEN` and `your-email@example.com` with your values.

**RA Request test:**

```bash
curl -X POST "http://localhost:3000/api/admin/emails/test" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com","templateType":"ra-request"}'
```

**RA Reminder test:**

```bash
curl -X POST "http://localhost:3000/api/admin/emails/test" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com","templateType":"ra-reminder"}'
```

**Success:** Response like `{"status":"success","data":{"emailId":"...","recipient":"...","templateType":"ra-request"}}`.  
Check the inbox (and spam) for the test email.

**If you get 401:** Use a valid admin Bearer token.  
**If you get "RESEND_API_KEY is not set":** Add `RESEND_API_KEY` to `.env.local` and restart `npm run dev`.

---

## 4. (Optional) Test stats and health

These need the `email_logs` table and related SQL (e.g. `fcr_20_email_integration_standalone.sql`) applied in Supabase.

**Stats:**

```bash
curl -X GET "http://localhost:3000/api/admin/emails/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Health:**

```bash
curl -X GET "http://localhost:3000/api/admin/emails/health" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

If the DB isn’t set up yet, these can return 500; the **test email** in step 3 does not depend on the DB.

---

## Quick checklist

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | `npm run dev` | Server running on port 3000 |
| 2 | Get admin token from admin app | Bearer token copied |
| 3 | `POST /api/admin/emails/test` with your email | 200 + email received |
