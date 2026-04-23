// Supabase Edge Function: send-service-request-notifications
// Handles email notifications for on-site service requests (field rep visits)
// Deploy: supabase functions deploy send-service-request-notifications --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import nodemailer from 'npm:nodemailer@6';

interface ServiceRequestNotificationPayload {
  type: 'new_request' | 'processor_action';
  requestData: any;
  
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
}

function getEnv(key: string, fallback = ''): string {
  return Deno.env.get(key) ?? fallback;
}

function buildTransporter() {
  const host = getEnv('SMTP_HOST');
  const port = parseInt(getEnv('SMTP_PORT', '587'), 10);
  const secure = getEnv('SMTP_SECURE') === 'true';
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured – set SMTP_HOST, SMTP_USER, SMTP_PASS secrets');
  }

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function purposeLabel(p: string): string {
  switch (p) {
    case 'return_pickup': return 'Return Pickup';
    case 'training': return 'Training';
    case 'inventory_review': return 'Inventory Review';
    case 'destruction_pickup': return 'Destruction Pickup';
    default: return 'Other';
  }
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return d;
  }
}

function buildNewRequestHtml(
  requestData: any,
  pharmacyName: string,
  pharmacyAddress: string,
  pharmacyPhone: string
): string {
  const requestedDate = formatDate(requestData?.requested_date);
  const purpose = purposeLabel(requestData?.purpose || '');
  const instructions = requestData?.special_instructions || '(none)';

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
  <div style="max-width:640px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
    <h2 style="margin:0 0 16px 0;color:#065f46;">New On-Site Service Request</h2>
    <p style="margin:0 0 16px 0;">You have been assigned to a new service request. Log in to the portal to claim and schedule it.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;border:1px solid #e5e7eb;width:200px;background:#f9fafb;"><strong>Pharmacy</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${pharmacyName}</td></tr>
      ${pharmacyAddress ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Address</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${pharmacyAddress}</td></tr>` : ''}
      ${pharmacyPhone ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${pharmacyPhone}</td></tr>` : ''}
      <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Preferred Date</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${requestedDate}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Purpose</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${purpose}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;vertical-align:top;"><strong>Special Instructions</strong></td><td style="padding:8px;border:1px solid #e5e7eb;white-space:pre-wrap;">${instructions}</td></tr>
    </table>
    <p style="margin:16px 0 8px 0;color:#6b7280;font-size:13px;">
      Note: multiple processors may have received this email. Once one of you claims and schedules this request,
      it will disappear from the other reps' queues.
    </p>
  </div>
</body></html>`;
}

function buildPharmacyActionHtml(
  requestData: any,
  action: string,
  processorName: string,
  processorPhone: string,
  pharmacyName: string
): string {
  let actionTitle = '';
  let actionMessage = '';
  let actionColor = '#065f46';
  
  const scheduledDate = formatDate(requestData?.scheduled_date);
  const requestedDate = formatDate(requestData?.requested_date);
  const purpose = purposeLabel(requestData?.purpose || '');
  
  if (action === 'schedule') {
    actionTitle = 'Service Request Scheduled';
    actionMessage = `${processorName} has scheduled your on-site service request for ${scheduledDate}.`;
    actionColor = '#2563eb';
  } else if (action === 'complete') {
    actionTitle = 'Service Request Completed';
    actionMessage = `${processorName} has completed your on-site service request.`;
    actionColor = '#059669';
  } else if (action === 'cancel') {
    actionTitle = 'Service Request Cancelled';
    actionMessage = `${processorName} has cancelled your on-site service request.`;
    actionColor = '#dc2626';
  }

  const notes = requestData?.scheduler_notes || requestData?.completion_notes || requestData?.cancelled_reason || '';

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
  <div style="max-width:640px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
    <h2 style="margin:0 0 16px 0;color:${actionColor};">${actionTitle}</h2>
    <p style="margin:0 0 16px 0;">Hello ${pharmacyName},</p>
    <p style="margin:0 0 16px 0;">${actionMessage}</p>
    
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;border:1px solid #e5e7eb;width:200px;background:#f9fafb;"><strong>Field Representative</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${processorName}</td></tr>
      ${processorPhone ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Rep Phone</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${processorPhone}</td></tr>` : ''}
      <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Original Request Date</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${requestedDate}</td></tr>
      ${action === 'schedule' && scheduledDate !== '—' ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Scheduled Date</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${scheduledDate}</td></tr>` : ''}
      <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Purpose</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${purpose}</td></tr>
      ${notes ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;vertical-align:top;"><strong>Notes</strong></td><td style="padding:8px;border:1px solid #e5e7eb;white-space:pre-wrap;">${notes}</td></tr>` : ''}
    </table>
    
    <p style="margin:16px 0 8px 0;color:#6b7280;font-size:13px;">
      If you have any questions, please contact your field representative directly.
    </p>
  </div>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ServiceRequestNotificationPayload = await req.json();
    const { type, requestData } = payload;

    if (!type || !requestData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing type or requestData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromEmail = getEnv('SMTP_FROM_EMAIL', getEnv('FROM_EMAIL'));
    const fromName = getEnv('SMTP_FROM_NAME', getEnv('CONTACT_NAME', 'Field Service Team'));
    const replyTo = getEnv('SMTP_USER') || getEnv('REPLY_TO_EMAIL');
    const transporter = buildTransporter();

    const results: Array<{ email: string; success: boolean; messageId?: string; error?: string }> = [];

    if (type === 'new_request') {
      const { assignedProcessors = [] } = payload;
      if (!assignedProcessors.length) {
        return new Response(
          JSON.stringify({ success: false, error: 'No assigned processors for new request' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch pharmacy details from the request data
      let pharmacyName = 'Pharmacy';
      let pharmacyAddress = '';
      let pharmacyPhone = '';
      
      // Try multiple possible field names from different RPC responses
      if (requestData?.pharmacy_name) {
        pharmacyName = requestData.pharmacy_name;
      } else if (requestData?.pharmacy_business_name) {
        pharmacyName = requestData.pharmacy_business_name;
      } else if (requestData?.name) {
        pharmacyName = requestData.name;
      }
      
      pharmacyAddress = requestData?.pharmacy_address || requestData?.address || '';
      pharmacyPhone = requestData?.pharmacy_phone || requestData?.phone || '';

      const subject = `New On-Site Service Request — ${pharmacyName} — ${formatDate(requestData?.requested_date)}`;
      const html = buildNewRequestHtml(requestData, pharmacyName, pharmacyAddress, pharmacyPhone);

      // Send to each assigned processor
      for (const processor of assignedProcessors) {
        const email = processor.email?.trim();
        if (!email) {
          results.push({ email: 'unknown', success: false, error: 'No email address' });
          continue;
        }

        try {
          const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: email,
            subject,
            html,
            replyTo: replyTo || undefined,
          });
          results.push({ email, success: true, messageId: info.messageId });
        } catch (error: any) {
          console.error(`Failed to send to processor ${email}:`, error);
          results.push({ email, success: false, error: error.message });
        }
      }

    } else if (type === 'processor_action') {
      const { action, processorId } = payload;
      if (!action || !processorId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing action or processorId for processor_action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // We need pharmacy email and processor details
      // The requestData should include pharmacy info and the service should pass processor details
      let pharmacyEmail = '';
      let pharmacyName = 'there';
      if (requestData?.pharmacy_email) {
        pharmacyEmail = requestData.pharmacy_email;
        pharmacyName = requestData.pharmacy_business_name || requestData.pharmacy_name || pharmacyName;
      }

      if (!pharmacyEmail) {
        results.push({ email: 'pharmacy', success: false, error: 'No pharmacy email available' });
      } else {
        // These should be passed in the payload from the service layer
        const processorName = payload.processorName || 'Your field representative';
        const processorPhone = payload.processorPhone || '';

        let actionWord = action;
        if (action === 'schedule') actionWord = 'scheduled';
        else if (action === 'complete') actionWord = 'completed';
        else if (action === 'cancel') actionWord = 'cancelled';

        const subject = `Service Request ${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)} — ${pharmacyName}`;
        const html = buildPharmacyActionHtml(requestData, action, processorName, processorPhone, pharmacyName);

        try {
          const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: pharmacyEmail,
            subject,
            html,
            replyTo: replyTo || undefined,
          });
          results.push({ email: pharmacyEmail, success: true, messageId: info.messageId });
        } catch (error: any) {
          console.error(`Failed to send to pharmacy ${pharmacyEmail}:`, error);
          results.push({ email: pharmacyEmail, success: false, error: error.message });
        }
      }

    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown notification type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        sent: successCount,
        total: totalCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('send-service-request-notifications error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});