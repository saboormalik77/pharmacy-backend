# FCR System Email Integration Plan

## Executive Summary

Based on the analysis of the FCR (First Class Returns) system and client meeting documentation, **email integration is critical for the RA (Return Authorization) request process**. The system currently has placeholder functionality for sending RA requests to manufacturers but lacks actual email delivery implementation.

## Email Requirements Analysis

### 1. **Primary Use Case: RA Request Emails**

From the client meeting and system analysis, the main email integration point is:

- **RA Request Process**: When debit memos are generated for manufacturers, the system needs to automatically send email requests to manufacturer RA teams
- **Volume**: Client mentioned sending "20 individual emails because there's 20 debit memos" in a typical batch
- **Recipients**: Manufacturer RA teams (e.g., "Sandra" at Inmar, Qualanex, etc.)
- **Content**: Debit memo details, pharmacy info, NDC list, quantities, ask prices
- **Follow-up**: Reminder emails when no response received within tickler date (14 days)

### 2. **Current Implementation Status**

**Existing Code Structure:**
- ✅ Email template generation: `ra_generate_request_email()` RPC function
- ✅ RA tracking system: Complete workflow in `src/services/raService.ts`
- ✅ Email preview functionality: `emailPreviewHandler` in controllers
- ❌ **Missing**: Actual email sending implementation

**Key Files:**
- `src/services/raService.ts` - RA business logic (ready)
- `src/controllers/raController.ts` - API endpoints (ready)
- `scripts/fcr_16_ra_request_tracking.sql` - Database functions (ready)

### 3. **Client Meeting Evidence**

From `meetingdiscussionwithclient.txt`:

```
[20:17:26] Bryan: "But this so this would do the email for each of these debit memos. But it does it one by one."
[20:17:35] Josephine: "Yep."
[20:17:36] Bryan: "Okay, so this would automatically send out whatever 20 individual emails because there's 20 debit memos on here."
[20:17:42] Josephine: "For each for each set at number yes."
[20:17:45] Bryan: "Okay and then you then receive back. Is it a reply back to that email that says here's your ra number?"
[20:17:53] Josephine: "Yes."
```

**Key Requirements:**
- Automated email sending per debit memo
- Email replies contain RA numbers
- System generates email content automatically
- Manufacturers respond via email with RA authorization

## Recommended Email Service Provider

### **Primary Recommendation: Resend**

**Why Resend:**
1. **Best Developer Experience**: Modern API, excellent Supabase integration
2. **Cost Effective**: $0.80 for 5K emails/month, 3K free emails/month
3. **React Email Templates**: Perfect for structured RA request emails
4. **Proven Supabase Integration**: Official documentation and examples
5. **Reliability**: Good deliverability, modern infrastructure

**Comparison with Alternatives:**
- **SendGrid**: More expensive ($20.75 for 5K), complex for simple use case
- **Postmark**: More expensive ($23.82 for 5K), overkill for transactional-only
- **AWS SES**: Cheapest but complex setup, requires more development time

### **Volume Estimation:**
- Client processes ~20 debit memos per batch
- Monthly batches = ~20 emails/month for RA requests
- Plus reminders = ~40 emails/month total
- **Resend free tier (3K/month) is more than sufficient**

## Implementation Plan

### **Phase 1: Core Email Infrastructure (Week 1)**

#### 1.1 Setup Resend Account
- [ ] Create Resend account
- [ ] Verify domain (client's business domain)
- [ ] Generate API key
- [ ] Add API key to Supabase secrets: `RESEND_API_KEY`

#### 1.2 Create Supabase Edge Function
```bash
supabase functions new send-ra-email
```

**Function Structure:**
```typescript
// supabase/functions/send-ra-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, subject, html, memoNumber } = await req.json()
  
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ra-requests@[client-domain].com',
      to: [to],
      subject: subject,
      html: html,
      tags: [
        { name: 'type', value: 'ra-request' },
        { name: 'memo', value: memoNumber }
      ]
    }),
  })
  
  return new Response(JSON.stringify(await res.json()), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

#### 1.3 Update RA Service
Modify `src/services/raService.ts`:

```typescript
// Add email sending function
export const sendRAEmail = async (emailData: RAEmailTemplate): Promise<void> => {
  const { supabaseAdmin } = await import('../config/supabase');
  
  const { data, error } = await supabaseAdmin.functions.invoke('send-ra-email', {
    body: {
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.body,
      memoNumber: emailData.memoNumber
    }
  });
  
  if (error) throw new AppError(`Failed to send RA email: ${error.message}`, 500);
  return data;
};

// Update existing sendRARequest function
export const sendRARequest = async (
  debitMemoId: string,
  sentBy?: string,
  emailOverride?: string
): Promise<{ memo: any; request: RARequest }> => {
  // ... existing RPC call to generate email template ...
  
  // NEW: Actually send the email
  try {
    await sendRAEmail(emailTemplate);
    
    // Update status to 'sent'
    await sb.rpc('ra_update_request_status', {
      p_request_id: request.id,
      p_status: 'sent'
    });
  } catch (emailError) {
    // Update status to 'failed'
    await sb.rpc('ra_update_request_status', {
      p_request_id: request.id,
      p_status: 'failed',
      p_error_message: emailError.message
    });
    throw emailError;
  }
  
  return { memo, request };
};
```

### **Phase 2: Email Templates (Week 2)**

#### 2.1 Create React Email Templates
```bash
npm install react-email @react-email/components
```

**RA Request Template:**
```typescript
// src/email-templates/RARequestTemplate.tsx
import {
  Body, Container, Head, Html, Preview, Section, Text, Hr
} from '@react-email/components';

interface RARequestEmailProps {
  memoNumber: string;
  pharmacyName: string;
  destination: string;
  labelerName: string;
  totalItems: number;
  totalAskValue: number;
  items: Array<{
    ndc: string;
    productName: string;
    quantity: number;
    askPrice: number;
  }>;
}

export default function RARequestEmail({
  memoNumber, pharmacyName, destination, labelerName,
  totalItems, totalAskValue, items
}: RARequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>RA Request for Debit Memo {memoNumber}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container>
          <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Return Authorization Request
          </Text>
          
          <Section>
            <Text><strong>Debit Memo:</strong> {memoNumber}</Text>
            <Text><strong>Pharmacy:</strong> {pharmacyName}</Text>
            <Text><strong>Destination:</strong> {destination}</Text>
            <Text><strong>Manufacturer:</strong> {labelerName}</Text>
            <Text><strong>Total Items:</strong> {totalItems}</Text>
            <Text><strong>Total Ask Value:</strong> ${totalAskValue.toFixed(2)}</Text>
          </Section>
          
          <Hr />
          
          <Section>
            <Text style={{ fontWeight: 'bold' }}>Items for Return:</Text>
            {items.map((item, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <Text><strong>NDC:</strong> {item.ndc}</Text>
                <Text><strong>Product:</strong> {item.productName}</Text>
                <Text><strong>Quantity:</strong> {item.quantity}</Text>
                <Text><strong>Ask Price:</strong> ${item.askPrice.toFixed(2)}</Text>
                <Hr />
              </div>
            ))}
          </Section>
          
          <Section>
            <Text>Please provide RA number for this return request.</Text>
            <Text>Contact: [client contact info]</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

#### 2.2 Update Edge Function with Templates
Integrate React Email rendering in the Edge Function.

### **Phase 3: Enhanced Features (Week 3)**

#### 3.1 Email Status Tracking
- [ ] Add webhook endpoint for Resend delivery status
- [ ] Update database with delivery confirmations
- [ ] Track bounces and failures

#### 3.2 Reminder System
- [ ] Implement automated reminder emails
- [ ] Update tickler date logic
- [ ] Add escalation rules

#### 3.3 Admin Dashboard
- [ ] Email sending logs in admin panel
- [ ] Failed email retry functionality
- [ ] Email template preview and testing

### **Phase 4: Testing & Deployment (Week 4)**

#### 4.1 Testing Strategy
- [ ] Unit tests for email functions
- [ ] Integration tests with Resend API
- [ ] End-to-end RA request workflow testing
- [ ] Load testing for batch email sending

#### 4.2 Production Deployment
- [ ] Deploy Edge Function to production
- [ ] Configure production domain verification
- [ ] Set up monitoring and alerting
- [ ] Create runbook for email issues

## Database Schema Updates

### **New Tables (if needed):**

```sql
-- Email sending logs
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ra_request_id UUID REFERENCES ra_requests(id),
  resend_email_id VARCHAR(255), -- Resend's email ID
  status VARCHAR(50), -- 'sent', 'delivered', 'bounced', 'failed'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **RPC Function Updates:**

```sql
-- Update ra_send_request to handle email sending status
CREATE OR REPLACE FUNCTION ra_update_request_status(
  p_request_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE ra_requests 
  SET 
    status = p_status,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql;
```

## Configuration Requirements

### **Environment Variables:**
```env
# Supabase Secrets
RESEND_API_KEY=re_your_api_key_here

# Email Configuration
FROM_EMAIL=ra-requests@[client-domain].com
REPLY_TO_EMAIL=support@[client-domain].com
```

### **Domain Setup:**
1. Add DNS records for client domain in Resend
2. Verify domain ownership
3. Configure SPF, DKIM, DMARC records for deliverability

## Cost Analysis

### **Resend Pricing:**
- **Free Tier**: 3,000 emails/month (sufficient for current needs)
- **Paid Tier**: $20/month for 50,000 emails (if scaling up)
- **Per Email**: $0.0004 per email after free tier

### **Estimated Monthly Costs:**
- **Current Volume**: ~40 emails/month = **FREE**
- **Scale to 500 pharmacies**: ~1,000 emails/month = **FREE**
- **Enterprise Scale**: 5,000+ emails/month = **$20/month**

## Risk Mitigation

### **Email Deliverability:**
- Use authenticated domain
- Implement proper SPF/DKIM/DMARC
- Monitor bounce rates
- Maintain sender reputation

### **System Reliability:**
- Implement retry logic for failed sends
- Queue emails for batch processing
- Add fallback email providers if needed
- Monitor Edge Function performance

### **Compliance:**
- Ensure CAN-SPAM compliance
- Add unsubscribe links if required
- Log all email activities for audit

## Success Metrics

### **Technical Metrics:**
- Email delivery rate > 98%
- Email bounce rate < 2%
- API response time < 2 seconds
- System uptime > 99.5%

### **Business Metrics:**
- RA response time improvement
- Reduction in manual email processes
- Increased batch processing efficiency
- User satisfaction with automated emails

## Next Steps

1. **Immediate**: Set up Resend account and verify domain
2. **Week 1**: Implement basic Edge Function and test with staging
3. **Week 2**: Create production-ready email templates
4. **Week 3**: Deploy to production with monitoring
5. **Week 4**: Full integration testing and user training

## Conclusion

Email integration is **essential** for the FCR system's RA request workflow. Resend provides the optimal balance of developer experience, cost-effectiveness, and reliability for this use case. The implementation can be completed in 4 weeks with minimal risk and immediate business value.

The current system architecture already supports email integration - we just need to add the actual sending mechanism via Supabase Edge Functions and Resend API.