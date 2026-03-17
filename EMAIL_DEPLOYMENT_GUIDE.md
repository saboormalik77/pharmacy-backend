# FCR Email Integration Deployment Guide

## Prerequisites

- Supabase CLI installed and configured
- Access to Supabase project dashboard
- Domain for email sending (recommended)
- Resend account (free tier available)

## Step 1: Resend Setup

### 1.1 Create Resend Account
1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 1.2 Domain Verification (Recommended)
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `your-company.com`)
4. Add the provided DNS records to your domain:
   - SPF record: `v=spf1 include:_spf.resend.com ~all`
   - DKIM record: (provided by Resend)
   - DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com`
5. Wait for verification (can take up to 24 hours)

### 1.3 Generate API Key
1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Name it "FCR Production" or similar
4. Select "Full access" permissions
5. Copy the API key (starts with `re_`)

## Step 2: Database Setup

### 2.1 Run Email Integration SQL

**Option A: Full Integration (requires existing FCR tables)**
```sql
-- In your Supabase dashboard SQL Editor, run:
-- This requires fcr_15_batch_closeout.sql and fcr_16_ra_request_tracking.sql to be run first
```
Execute `scripts/fcr_20_email_integration.sql` in Supabase SQL Editor.

**Option B: Standalone Version (for testing)**
```sql
-- In your Supabase dashboard SQL Editor, run:
-- This can be run independently for testing email functionality
```
Execute `scripts/fcr_20_email_integration_standalone.sql` in Supabase SQL Editor.

### 2.2 Verify Database Changes
Check that these tables/functions were created:
- `email_logs` table
- `email_logs_with_memo_info` view
- `ra_update_request_status()` function
- `log_email_status()` function
- `get_email_stats()` function

## Step 3: Supabase Edge Functions Deployment

### 3.1 Set Environment Secrets
```bash
# Set required secrets for Edge Functions
supabase secrets set RESEND_API_KEY="re_your_actual_api_key"
supabase secrets set FROM_EMAIL="ra-requests@your-domain.com"
supabase secrets set REPLY_TO_EMAIL="support@your-domain.com"
supabase secrets set CONTACT_NAME="Returns Department"
supabase secrets set CONTACT_EMAIL="returns@your-domain.com"
supabase secrets set CONTACT_PHONE="(555) 123-4567"
```

### 3.2 Deploy Edge Functions
```bash
# Deploy the basic email function
supabase functions deploy send-ra-email

# Deploy the enhanced email function with templates
supabase functions deploy send-ra-email-enhanced

# Deploy the webhook handler (optional)
supabase functions deploy resend-webhook
```

### 3.3 Verify Deployment
```bash
# Check function status
supabase functions list

# Test basic function
curl -X POST "https://your-project-ref.supabase.co/functions/v1/send-ra-email" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Test email</p>","memoNumber":"TEST-001"}'
```

## Step 4: Application Configuration

### 4.1 Update Environment Variables
Add to your `.env` file:
```env
RESEND_API_KEY=re_your_actual_api_key
FROM_EMAIL=ra-requests@your-domain.com
REPLY_TO_EMAIL=support@your-domain.com
CONTACT_NAME=Returns Department
CONTACT_EMAIL=returns@your-domain.com
CONTACT_PHONE=(555) 123-4567
```

### 4.2 Restart Application
```bash
# Restart your Node.js application to load new environment variables
npm run dev  # or your production restart command
```

## Step 5: Testing

### 5.1 Test Email Sending
Use the test endpoint:
```bash
curl -X POST "http://localhost:3000/api/admin/emails/test" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"your-test-email@example.com","templateType":"ra-request"}'
```

### 5.2 Test RA Request Flow
1. Create a test debit memo in the admin panel
2. Send an RA request
3. Check email logs: `GET /api/admin/emails/logs`
4. Verify email delivery in Resend dashboard

### 5.3 Test Email Management
1. View email statistics: `GET /api/admin/emails/stats`
2. Check health report: `GET /api/admin/emails/health`
3. Test retry functionality if needed

## Step 6: Webhook Setup (Optional)

### 6.1 Configure Resend Webhook
1. In Resend dashboard, go to "Webhooks"
2. Click "Add Webhook"
3. Set URL to: `https://your-project-ref.supabase.co/functions/v1/resend-webhook`
4. Select events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`
5. Add webhook secret (optional but recommended)

### 6.2 Set Webhook Secret
```bash
supabase secrets set RESEND_WEBHOOK_SECRET="your_webhook_secret"
```

## Step 7: Production Monitoring

### 7.1 Set Up Monitoring
- Monitor email delivery rates in Resend dashboard
- Check email logs regularly: `/api/admin/emails/logs`
- Review health reports: `/api/admin/emails/health`
- Set up alerts for high bounce rates

### 7.2 Regular Maintenance
- Review failed emails weekly
- Update contact information as needed
- Monitor domain reputation
- Check for bounced email addresses

## Troubleshooting

### Common Issues

#### 1. "RESEND_API_KEY not configured"
- Verify API key is set in Supabase secrets
- Check API key format (should start with `re_`)
- Ensure Edge Function has been redeployed after setting secrets

#### 2. "Failed to send email via Resend"
- Check domain verification status
- Verify FROM_EMAIL uses verified domain
- Check Resend API key permissions
- Review Resend dashboard for error details

#### 3. "Email delivery issues"
- Check SPF/DKIM/DMARC records
- Review sender reputation in Resend
- Verify recipient email addresses
- Check spam folder

#### 4. "Database errors"
- Ensure fcr_20_email_integration.sql was run
- Check table permissions
- Verify RPC functions exist

### Debugging Commands

```bash
# Check Edge Function logs
supabase functions logs send-ra-email-enhanced

# Test database functions
SELECT get_email_stats(NULL, NULL);

# Check email logs
SELECT * FROM email_logs_with_memo_info ORDER BY sent_at DESC LIMIT 10;

# Verify secrets
supabase secrets list
```

## Performance Optimization

### 1. Email Rate Limiting
- Resend free tier: 100 emails/day
- Paid tier: Higher limits available
- Implement queuing for high-volume sending

### 2. Template Caching
- Templates are rendered on each send
- Consider caching for high-volume scenarios
- Monitor Edge Function performance

### 3. Database Optimization
- Email logs table will grow over time
- Consider archiving old logs
- Monitor query performance

## Security Considerations

### 1. API Key Security
- Store API keys in Supabase secrets only
- Never commit API keys to version control
- Rotate keys regularly

### 2. Email Content
- Sanitize all email content
- Validate recipient addresses
- Implement rate limiting

### 3. Webhook Security
- Use webhook secrets for verification
- Validate webhook payloads
- Monitor for suspicious activity

## Support

For issues with:
- **Resend**: Check [Resend documentation](https://resend.com/docs) or contact Resend support
- **Supabase**: Check [Supabase documentation](https://supabase.com/docs) or Supabase community
- **FCR Integration**: Review this guide and check application logs

## Success Metrics

Track these metrics to ensure successful deployment:
- Email delivery rate > 98%
- Email bounce rate < 2%
- RA response time improvement
- Reduced manual email processes
- User satisfaction with automated emails