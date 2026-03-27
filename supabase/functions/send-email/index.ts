// Supabase Edge Function: send-email
// Uses nodemailer via npm: specifier for Deno runtime.
// Deploy:  supabase functions deploy send-email --no-verify-jwt
// Secrets: supabase secrets set SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... SMTP_FROM_EMAIL=... SMTP_FROM_NAME="Returns Department" REPLY_TO_EMAIL=...
// Note: SMTP_USER is used as the primary reply-to address, falling back to REPLY_TO_EMAIL

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import nodemailer from 'npm:nodemailer@6';

interface EmailPayload {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
  templateType?: 'ra-request' | 'ra-reminder' | 'payment-reminder';
  templateData?: Record<string, unknown>;
  
  recipientName?: string;
  contactInfo?: { name?: string; email?: string; phone?: string };
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

// ── Currency formatter ───────────────────────────────────────
function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ── HTML builders (same templates as Node service) ───────────

function buildRARequestHtml(
  data: Record<string, any>,
  recipientName?: string,
  contactInfo?: { name?: string; email?: string; phone?: string }
): string {
  const items: any[] = data.items ?? [];
  const rows = items
    .map(
      (i: any) => `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${i.ndc}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${i.productName}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmt(i.askPrice)}</td>
      </tr>`
    )
    .join('');

  const cName = contactInfo?.name || 'Returns Department';
  const cEmail = contactInfo?.email || '';
  const cPhone = contactInfo?.phone || '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;color:#374151;background:#f9fafb;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden;">
  <div style="background:#1f2937;color:#fff;padding:24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;">Return Authorization Request</h1>
  </div>
  <div style="padding:32px;">
    <p>Dear ${recipientName || 'Returns Department'},</p>
    <p>We are requesting Return Authorization for the following items.</p>
    <div style="background:#f3f4f6;padding:20px;border-radius:6px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;">Request Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:bold;width:140px;">Debit Memo:</td><td>${data.memoNumber}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Pharmacy:</td><td>${data.pharmacyName}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Destination:</td><td>${data.destination || 'N/A'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Manufacturer:</td><td>${data.labelerName || 'N/A'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Total Items:</td><td>${data.totalItems || 0}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Total Ask Value:</td><td style="font-weight:bold;color:#059669;">${fmt(data.totalAskValue || 0)}</td></tr>
      </table>
    </div>
    ${items.length ? `
    <h3>Items for Return</h3>
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:left;">NDC</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:left;">Product</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:center;">Qty</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;">Ask Price</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>` : ''}
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-weight:bold;color:#1e40af;">Next Steps:</p>
      <p style="margin:8px 0 0;">Please reply with the Return Authorization number and processing instructions.</p>
    </div>
    <p>Thank you,</p>
  </div>
  <div style="background:#f9fafb;padding:24px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;">
    <p style="margin:0 0 6px;font-weight:bold;">${cName}</p>
    ${cEmail ? `<p style="margin:0 0 4px;">${cEmail}</p>` : ''}
    ${cPhone ? `<p style="margin:0;">Phone: ${cPhone}</p>` : ''}
  </div>
</div>
</body></html>`;
}

function buildRAReminderHtml(
  data: Record<string, any>,
  recipientName?: string,
  contactInfo?: { name?: string; email?: string; phone?: string }
): string {
  const days = data.daysSinceRequest || 0;
  const urgencyColor = days > 21 ? '#dc2626' : days > 14 ? '#d97706' : '#059669';
  const urgencyText = days > 21 ? 'URGENT' : days > 14 ? 'ATTENTION NEEDED' : 'REMINDER';
  const cName = contactInfo?.name || 'Returns Department';
  const cEmail = contactInfo?.email || '';
  const cPhone = contactInfo?.phone || '';

  // Build items table if items are provided
  const items = data.items || [];
  const itemsHtml = items.length ? `
    <h3 style="margin:24px 0 16px;">Items Awaiting Return Authorization</h3>
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:left;font-size:12px;">NDC</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:left;font-size:12px;">Product</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">Qty</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;font-size:12px;">Ask Price</th>
          ${items.some((i: any) => i.lotNumber) ? '<th style="padding:10px 8px;border:1px solid #e5e7eb;font-size:12px;">Lot #</th>' : ''}
          ${items.some((i: any) => i.expirationDate) ? '<th style="padding:10px 8px;border:1px solid #e5e7eb;font-size:12px;">Exp Date</th>' : ''}
        </tr></thead>
        <tbody>
          ${items.map((item: any) => `<tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.ndc}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.productName}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-size:13px;">${fmt(item.askPrice)}</td>
            ${item.lotNumber ? `<td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.lotNumber}</td>` : ''}
            ${item.expirationDate ? `<td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.expirationDate}</td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;color:#374151;background:#f9fafb;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden;">
  <div style="background:${urgencyColor};color:#fff;padding:24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;">${urgencyText}: RA Request Follow-up</h1>
  </div>
  <div style="padding:32px;">
    <p>Dear ${recipientName || 'Returns Department'},</p>
    <p>This is follow-up #${data.requestCount || 1} regarding our Return Authorization request for <strong>${data.memoNumber}</strong>.</p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-weight:bold;color:#92400e;">Status:</p>
      <p style="margin:8px 0 0;color:#92400e;">This request has been pending for <strong>${days} days</strong>. We kindly request your prompt response.</p>
    </div>
    <div style="background:#f3f4f6;padding:20px;border-radius:6px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;">Return Authorization Request Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:bold;width:140px;">Debit Memo:</td><td>${data.memoNumber}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Pharmacy:</td><td>${data.pharmacyName}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Destination:</td><td>${data.destination || 'N/A'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Manufacturer:</td><td>${data.labelerName || 'N/A'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Total Items:</td><td>${data.totalItems || 0}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Total Ask Value:</td><td style="font-weight:bold;color:#059669;">${fmt(data.totalAskValue || 0)}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Days Pending:</td><td style="color:${urgencyColor};font-weight:bold;">${days} days</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Follow-up #:</td><td>${data.requestCount || 1}</td></tr>
        ${data.originalDate ? `<tr><td style="padding:4px 0;font-weight:bold;">Original Request:</td><td>${new Date(data.originalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>` : ''}
      </table>
    </div>
    ${itemsHtml}
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-weight:bold;color:#1e40af;">Action Required:</p>
      <p style="margin:8px 0 0;">Please reply with:</p>
      <ul style="margin:8px 0 0 20px;color:#1e40af;">
        <li><strong>Return Authorization (RA) number</strong></li>
        <li>Any special processing instructions</li>
        <li>Expected processing timeline</li>
        <li>Return shipping address (if different from standard)</li>
      </ul>
    </div>
    <p>We appreciate your prompt attention to this matter.</p>
    <p>Best regards,</p>
  </div>
  <div style="background:#f9fafb;padding:24px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;">
    <p style="margin:0 0 6px;font-weight:bold;">${cName}</p>
    ${cEmail ? `<p style="margin:0 0 4px;">${cEmail}</p>` : ''}
    ${cPhone ? `<p style="margin:0;">Phone: ${cPhone}</p>` : ''}
  </div>
</div>
</body></html>`;
}

function buildPaymentReminderHtml(
  data: Record<string, any>,
  recipientName?: string,
  contactInfo?: { name?: string; email?: string; phone?: string }
): string {
  const cName = contactInfo?.name || 'Returns Department';
  const cEmail = contactInfo?.email || '';
  const cPhone = contactInfo?.phone || '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;color:#374151;background:#f9fafb;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden;">
  <div style="background:#dc2626;color:#fff;padding:24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;">Payment Reminder</h1>
  </div>
  <div style="padding:32px;">
    <p>Dear ${recipientName || 'Accounts Payable'},</p>
    <p>This is a payment reminder for the following debit memo that remains outstanding.</p>
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-weight:bold;color:#991b1b;">Outstanding Payment:</p>
      <p style="margin:8px 0 0;color:#991b1b;font-size:18px;font-weight:bold;">${fmt(data.outstandingAmount || 0)}</p>
    </div>
    <div style="background:#f3f4f6;padding:20px;border-radius:6px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;">Payment Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:bold;width:140px;">Debit Memo:</td><td>${data.memoNumber}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Pharmacy:</td><td>${data.pharmacyName}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Destination:</td><td>${data.destination || 'N/A'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Original Amount:</td><td style="font-weight:bold;">${fmt(data.originalAmount || 0)}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Outstanding:</td><td style="font-weight:bold;color:#dc2626;">${fmt(data.outstandingAmount || 0)}</td></tr>
      </table>
    </div>
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-weight:bold;color:#1e40af;">Payment Request:</p>
      <p style="margin:8px 0 0;color:#1e40af;">Please process payment for the outstanding amount of <strong>${fmt(data.outstandingAmount || 0)}</strong> at your earliest convenience.</p>
    </div>
    <p>If you have any questions regarding this payment or need additional documentation, please don't hesitate to contact us.</p>
    <p>Thank you for your prompt attention to this matter.</p>
    <p>Best regards,</p>
  </div>
  <div style="background:#f9fafb;padding:24px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;">
    <p style="margin:0 0 6px;font-weight:bold;">${cName}</p>
    ${cEmail ? `<p style="margin:0 0 4px;">${cEmail}</p>` : ''}
    ${cPhone ? `<p style="margin:0;">Phone: ${cPhone}</p>` : ''}
  </div>
</div>
</body></html>`;
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { to, templateType, templateData, recipientName, contactInfo } = payload;
    
    // Handle both direct email and template-based sending
    const recipientEmail = to || (templateData as any)?.to;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ success: false, error: 'Missing recipient email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!to) {
      return new Response(JSON.stringify({ success: false, error: 'Missing "to"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromEmail = getEnv('SMTP_FROM_EMAIL', getEnv('FROM_EMAIL'));
    const fromName = getEnv('SMTP_FROM_NAME', getEnv('CONTACT_NAME', 'Returns Department'));
    const replyTo = payload.replyTo || getEnv('SMTP_USER') || getEnv('REPLY_TO_EMAIL');
    const transporter = buildTransporter();

    let subject = payload.subject || '';
    let html = payload.html || '';

    if (templateType && templateData) {
      if (templateType === 'ra-request') {
        subject = subject || `Return Authorization Request — ${templateData.memoNumber}`;
        html = buildRARequestHtml(templateData, recipientName, contactInfo);
      } else if (templateType === 'ra-reminder') {
        const count = (templateData.requestCount as number) || 1;
        subject = subject || `REMINDER: RA Request — ${templateData.memoNumber} (Follow-up #${count})`;
        html = buildRAReminderHtml(templateData, recipientName, contactInfo);
      } else if (templateType === 'payment-reminder') {
        subject = subject || `Payment Reminder — ${templateData.memoNumber}`;
        html = buildPaymentReminderHtml(templateData, recipientName, contactInfo);
      }
    }

    if (!subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing subject/html or templateType/templateData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html,
      replyTo: replyTo || undefined,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('send-email error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
