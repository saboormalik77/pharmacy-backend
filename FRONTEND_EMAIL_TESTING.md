# Frontend Email Management Testing Guide

This guide walks you through testing the complete email management system from the admin frontend interface.

## Prerequisites

1. **Backend Setup**: Ensure the backend is running with email integration configured
2. **Database**: Run the email integration SQL script (`fcr_20_email_integration.sql` or `fcr_20_email_integration_standalone.sql`)
3. **Environment**: Configure `.env.local` with required email variables
4. **Admin Access**: Have admin credentials to log into the admin panel

## Required Environment Variables

Ensure these are set in your backend `.env.local`:

```bash
# Email Configuration
RESEND_API_KEY=re_ZFmTK6Lz_Artk8WoVcUbbmCbxBdp1wsh3
FROM_EMAIL=onboarding@resend.dev
REPLY_TO_EMAIL=your-email@example.com
CONTACT_NAME=Returns Department
CONTACT_EMAIL=returns@example.com
CONTACT_PHONE=+1-555-0123

# Supabase (if using Edge Functions)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step-by-Step Testing

### 1. Start the Applications

```bash
# Terminal 1: Start Backend
cd /path/to/pharmacy-backend
npm run dev

# Terminal 2: Start Admin Frontend
cd /path/to/pharmacy-backend/admin
npm run dev
```

### 2. Access Email Management

1. Open your browser and go to `http://localhost:3001` (or your admin frontend URL)
2. Log in with your admin credentials
3. In the sidebar, click on **"Email Management"** (should show a mail icon)

### 3. Test Email Sending

#### Send Test Email
1. Navigate to **Email Management > Test Email** tab
2. Enter your email address in the "Recipient Email Address" field
3. Select either "RA Request" or "RA Reminder" template
4. Click **"Send Test Email"**
5. You should see a success message with an Email ID
6. Check your email inbox (including spam folder) for the test email

#### Expected Results:
- ✅ Success message appears with email ID
- ✅ Test email arrives in your inbox within 1-2 minutes
- ✅ Email content is properly formatted with placeholder data
- ✅ Subject line matches the template type

### 4. Monitor Email Logs

1. Navigate to **Email Management > Email Logs** tab
2. You should see your test email in the list
3. Check the status badge (should show "Sent" initially, then "Delivered")
4. Click the eye icon (👁️) to view detailed email information

#### Test Filtering:
- Use the search box to find emails by recipient
- Filter by status (Sent, Delivered, Bounced, Failed)
- Filter by email type (RA Request, RA Reminder)
- Set date ranges to filter by send date

#### Expected Results:
- ✅ Test email appears in the logs list
- ✅ Status updates from "Sent" to "Delivered"
- ✅ All email details are visible in the detail modal
- ✅ Filters work correctly

### 5. View Statistics

1. Navigate to **Email Management > Statistics** tab
2. You should see metrics for your test emails
3. Try different date ranges using the quick buttons (7d, 30d, 90d)
4. Use custom date ranges with the date pickers

#### Expected Results:
- ✅ Statistics show total sent emails
- ✅ Delivery rate is calculated correctly
- ✅ Bounce rate is shown (should be 0% for successful tests)
- ✅ Performance indicators show appropriate colors
- ✅ Date range filtering works

### 6. Check Health Report

1. Navigate to **Email Management > Health Report** tab
2. Review the overall system health status
3. Check performance by email type
4. Review any recommendations

#### Expected Results:
- ✅ Overall health status is shown (should be "Excellent" for successful tests)
- ✅ Performance metrics are displayed by email type
- ✅ Recommendations appear based on performance
- ✅ No recent issues are shown (for successful tests)

### 7. Test Error Scenarios

#### Test Invalid Email:
1. Go to **Test Email** tab
2. Enter an invalid email address (e.g., `invalid-email`)
3. Try to send a test email
4. Should see validation error or API error

#### Test Network Issues:
1. Stop the backend server temporarily
2. Try to send a test email from the frontend
3. Should see connection error
4. Restart backend and verify recovery

### 8. Test Real RA Email Flow (Optional)

If you have access to the full system:

1. Create a debit memo through the normal flow
2. Trigger an RA request from the warehouse interface
3. Check Email Management to see the real RA email
4. Verify the email contains actual memo data (not placeholder)

## Troubleshooting

### Email Not Appearing in Logs
- Check browser console for JavaScript errors
- Verify backend API is running and accessible
- Check network tab for failed API requests
- Ensure admin authentication is working

### Test Email Not Received
- Check spam/junk folder
- Verify the email address is correct
- Check Email Logs for delivery status
- Look for error messages in the email details

### Statistics Not Loading
- Check if the database connection is working
- Verify the SQL scripts have been run
- Check backend logs for database errors
- Ensure the stats API endpoint is accessible

### Frontend Errors
- Check browser console for React/JavaScript errors
- Verify all dependencies are installed (`npm install`)
- Check if the API client is configured correctly
- Ensure the backend API URL is correct

## API Endpoints Being Tested

The frontend tests these backend endpoints:

- `GET /api/admin/emails/logs` - Email logs with pagination and filtering
- `GET /api/admin/emails/stats` - Email statistics
- `GET /api/admin/emails/health` - System health report
- `POST /api/admin/emails/test` - Send test email
- `POST /api/admin/emails/logs/:id/retry` - Retry failed email
- `POST /api/admin/emails/logs/:id/resolve` - Mark email as resolved

## Success Criteria

✅ **Complete Success** when:
- All 4 email management tabs load without errors
- Test emails can be sent and received
- Email logs display with correct status updates
- Statistics show accurate metrics
- Health report provides meaningful insights
- All filtering and pagination works
- Error handling works gracefully

## Next Steps

After successful testing:
1. Set up real manufacturer email addresses for production
2. Configure proper email authentication (SPF, DKIM, DMARC)
3. Set up monitoring and alerting for email failures
4. Train admin users on the email management interface
5. Document any custom configuration for your environment

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Review the browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied
5. Test the backend API endpoints directly with curl/Postman first