# Email Reply-To Address Fix

## Problem
When manufacturers reply to RA request emails, they were replying to `returns@fcr-system.com` instead of `saboor@hivve.org`, which meant the email monitoring system couldn't read their responses.

## Root Cause
The email services were using `REPLY_TO_EMAIL=returns@fcr-system.com` instead of `SMTP_USER=saboor@hivve.org` for the reply-to header.

## Solution
Updated all email services to prioritize `SMTP_USER` over `REPLY_TO_EMAIL` for the reply-to address:

### Files Modified

1. **Backend Services:**
   - `src/services/nodemailerService.ts` - Updated REPLY_TO priority
   - `src/services/resendRaEmailService.ts` - Updated REPLY_TO_EMAIL priority

2. **Supabase Edge Functions:**
   - `supabase/functions/send-email/index.ts` - Updated replyTo priority
   - `supabase/functions/send-ra-email/index.ts` - Updated replyToEmail priority
   - `supabase/functions/send-ra-email-enhanced/index.ts` - Updated replyToEmail priority

3. **Setup Script:**
   - `setup_supabase_secrets.sh` - Script to configure all Supabase secrets properly

### Priority Order (New)
```
reply-to = SMTP_USER || REPLY_TO_EMAIL || fallback
```

This ensures manufacturers will reply to `saboor@hivve.org`, which is:
- ✅ Monitored by the email reading system
- ✅ Configured with IMAP access
- ✅ The same account used for sending emails

## Deployment Steps

1. **Update Supabase Secrets:**
   ```bash
   ./setup_supabase_secrets.sh
   ```

2. **Deploy Edge Functions:**
   ```bash
   npx supabase functions deploy send-email
   npx supabase functions deploy send-ra-email
   npx supabase functions deploy send-ra-email-enhanced
   ```

3. **Restart Backend:**
   ```bash
   npm run dev
   ```

## Testing

1. Send a test RA request email
2. Check the email headers to verify `reply-to: saboor@hivve.org`
3. Reply to the email from the manufacturer's perspective
4. Verify the reply is processed by the email monitoring system

## Expected Result

**Before Fix:**
```
from: PharmAdmin <saboor@hivve.org>
reply-to: returns@fcr-system.com  ❌ Wrong address
```

**After Fix:**
```
from: PharmAdmin <saboor@hivve.org>
reply-to: saboor@hivve.org  ✅ Correct address
```

Now manufacturers will reply to the monitored email address, and the system will automatically process RA responses and mark them as read to prevent reprocessing! 🎯

## Email Processing Behavior

- **Production Mode**: `markAsRead: true` - Emails are marked as read after processing
- **Test Mode**: `markAsRead: false` - Emails remain unread (useful for testing)

### Commands:
- `npm run email-monitor:10s` - 10-second monitoring with mark-as-read
- `npm run email:check-once` - Single check with mark-as-read  
- `npm run email:test-only` - Single check without mark-as-read (testing)