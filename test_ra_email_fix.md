# RA Email Fix Testing Guide

## Problem Fixed
- **Issue**: "Edge Function returned a non-2xx status code"
- **Root Cause**: Supabase Edge Functions not deployed or not accessible
- **Solution**: Added fallback to direct Resend API when Edge Functions fail

## What Changed

1. **Enhanced Error Handling**: `sendEnhancedRAEmail` now tries Edge Function first, then falls back to direct Resend API
2. **Direct API Support**: Added `sendDirectRAEmail` function with full HTML email templates
3. **Better Logging**: Added console logs to track email sending attempts

## Testing Steps

### 1. Test RA Request (should work now)
1. Go to **Warehouse → RA Tracking**
2. Find a debit memo with status "pending"
3. Click **"Request RA"**
4. **Expected**: Email should send successfully via fallback API

### 2. Check Logs
Look for these console messages:
```
Attempting to send RA email for memo DM-XXXX to manufacturer@example.com
Edge Function failed, falling back to direct Resend API: [error message]
Successfully sent email via direct Resend API fallback
```

### 3. Verify Email Delivery
- Check the recipient email inbox
- Email should have professional formatting with:
  - Memo details
  - Pharmacy information  
  - Items table
  - Contact information

## Environment Requirements

Make sure these are set in `.env.local`:
```bash
RESEND_API_KEY=re_ZFmTK6Lz_Artk8WoVcUbbmCbxBdp1wsh3
FROM_EMAIL=onboarding@resend.dev
REPLY_TO_EMAIL=your-email@example.com
CONTACT_NAME=Returns Department
CONTACT_EMAIL=returns@example.com
CONTACT_PHONE=+1-555-0123
```

## Troubleshooting

### If still getting errors:
1. **Check Resend API Key**: Verify it's valid in Resend dashboard
2. **Check FROM_EMAIL**: Must be verified domain in Resend
3. **Check manufacturer_policies**: Ensure `credit_request_email` is set for the labeler
4. **Check console logs**: Look for specific error messages

### Test direct API without RA flow:
```bash
curl -X POST http://localhost:3000/api/admin/emails/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"to": "test@example.com", "templateType": "ra-request"}'
```

## Success Criteria
✅ RA request emails send successfully  
✅ Emails have professional formatting  
✅ Fallback works when Edge Functions unavailable  
✅ Email logs show delivery status  
✅ No more "non-2xx status code" errors