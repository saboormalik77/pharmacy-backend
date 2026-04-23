# Service Request Edge Function Integration

This document describes the edge function integration for service request email notifications.

## Overview

The on-site service request feature now uses Supabase Edge Functions for email notifications instead of direct SMTP from the Node.js backend. This provides better scalability, reliability, and separation of concerns.

## Edge Function

**Function:** `send-service-request-notifications`
**Location:** `supabase/functions/send-service-request-notifications/index.ts`

### Supported Notification Types

1. **`new_request`** - Sent to assigned processors when a pharmacy creates a new service request
2. **`processor_action`** - Sent to pharmacy when a processor schedules/completes/cancels a request

### Payload Structure

```typescript
interface ServiceRequestNotificationPayload {
  type: 'new_request' | 'processor_action';
  requestData: any; // The service request data from RPC
  
  // For new_request notifications
  assignedProcessors?: Array<{
    processor_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  }>;
  
  // For processor_action notifications
  action?: 'schedule' | 'complete' | 'cancel';
  processorId?: string;
  processorName?: string;
  processorPhone?: string;
}
```

## Backend Integration

**File:** `src/services/serviceRequestService.ts`

The service now calls the edge function instead of using direct SMTP:

- `notifyAssignedProcessorsOfNewRequest()` - Calls edge function with `type: 'new_request'`
- `notifyPharmacyOfProcessorAction()` - Calls edge function with `type: 'processor_action'`

## Deployment

### 1. Deploy the Edge Function

```bash
# Option 1: Deploy all functions including the new one
./deploy-edge-functions-simple.sh

# Option 2: Deploy with secrets (if needed)
./setup_supabase_secrets.sh --deploy

# Option 3: Deploy just this function
npx supabase functions deploy send-service-request-notifications --no-verify-jwt
```

### 2. Environment Variables

The edge function uses the same SMTP secrets as other email functions:

- `SMTP_HOST`
- `SMTP_PORT` (default: 587)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME` (default: "Field Service Team")

The backend service needs access to Supabase URL for edge function calls:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Anon key for edge function authentication (optional)

### 3. Verify Deployment

Check that the function is deployed:

```bash
npx supabase functions list
```

Test the function (optional):

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-service-request-notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "new_request",
    "requestData": {"pharmacy_id": "test", "requested_date": "2024-01-01", "purpose": "training"},
    "assignedProcessors": [{"processor_id": "test", "name": "Test Rep", "email": "test@example.com"}]
  }'
```

## Benefits

1. **Scalability** - Edge functions handle email sending without blocking the main backend
2. **Reliability** - Built-in retry and error handling
3. **Performance** - Non-blocking fire-and-forget notifications
4. **Monitoring** - Edge function logs are separate from backend logs
5. **Consistency** - Same email infrastructure as other notification types

## Fallback Behavior

If the edge function call fails, the error is logged but does not affect the core service request flow. The request creation/update will still succeed even if email notifications fail.

## Email Templates

The edge function includes HTML email templates that match the existing service request notification design:

- **New Request Template** - Clean table layout with pharmacy details, preferred date, purpose, and instructions
- **Processor Action Template** - Updates for schedule/complete/cancel actions with representative contact info

Both templates are responsive and follow the established visual design patterns.