/**
 * Send RA (Return Authorization) emails via Resend from Node.
 * Use this for testing without Supabase Edge Functions, or as fallback.
 */

import { Resend } from 'resend';
import { AppError } from '../utils/appError';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || '';

let resendClient: Resend | null = null;
if (RESEND_API_KEY) {
  resendClient = new Resend(RESEND_API_KEY);
}

export function isResendConfigured(): boolean {
  return !!resendClient;
}

/**
 * Build simple HTML for RA request test email
 */
function buildRaRequestTestHtml(data: {
  memoNumber: string;
  pharmacyName: string;
  destination: string;
  labelerName: string;
  totalItems: number;
  totalAskValue: number;
  items: Array<{ ndc: string; productName: string; quantity: number; askPrice: number }>;
}): string {
  const itemsRows = data.items
    .map(
      (i) =>
        `<tr><td>${i.ndc}</td><td>${i.productName}</td><td>${i.quantity}</td><td>$${i.askPrice.toFixed(2)}</td></tr>`
    )
    .join('');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>RA Request Test</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #1f2937;">Return Authorization Request (Test)</h2>
  <p><strong>Debit Memo:</strong> ${data.memoNumber}</p>
  <p><strong>Pharmacy:</strong> ${data.pharmacyName}</p>
  <p><strong>Destination:</strong> ${data.destination}</p>
  <p><strong>Manufacturer:</strong> ${data.labelerName}</p>
  <p><strong>Total Items:</strong> ${data.totalItems}</p>
  <p><strong>Total Ask Value:</strong> $${data.totalAskValue.toFixed(2)}</p>
  <h3>Items</h3>
  <table border="1" cellpadding="8" style="border-collapse: collapse;">
    <thead><tr><th>NDC</th><th>Product</th><th>Qty</th><th>Ask Price</th></tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <p style="margin-top: 24px; color: #6b7280;">This is a test email from the FCR email integration.</p>
</body>
</html>`;
}

/**
 * Build simple HTML for RA reminder test email
 */
function buildRaReminderTestHtml(data: {
  memoNumber: string;
  pharmacyName: string;
  requestCount: number;
  daysSinceRequest: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>RA Reminder Test</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #dc2626;">Return Authorization Reminder (Test)</h2>
  <p><strong>Debit Memo:</strong> ${data.memoNumber}</p>
  <p><strong>Pharmacy:</strong> ${data.pharmacyName}</p>
  <p><strong>Request #:</strong> ${data.requestCount}</p>
  <p><strong>Days Pending:</strong> ${data.daysSinceRequest}</p>
  <p style="margin-top: 24px; color: #6b7280;">This is a test reminder email from the FCR email integration.</p>
</body>
</html>`;
}

export interface SendRaTestEmailOptions {
  to: string;
  templateType: 'ra-request' | 'ra-reminder';
}

/**
 * Send a test RA email via Resend from Node (no Edge Function required).
 */
export async function sendRaTestEmailFromNode(
  options: SendRaTestEmailOptions
): Promise<{ emailId: string }> {
  if (!resendClient) {
    throw new AppError(
      'RESEND_API_KEY is not set in .env.local. Add it to test email sending.',
      500
    );
  }

  const { to, templateType } = options;
  const subject =
    templateType === 'ra-request'
      ? 'RA Request: Debit Memo TEST-001 - Test Pharmacy'
      : 'REMINDER - RA Request Follow-up #2: TEST-001 - Test Pharmacy';

  const html =
    templateType === 'ra-request'
      ? buildRaRequestTestHtml({
          memoNumber: 'TEST-001',
          pharmacyName: 'Test Pharmacy',
          destination: 'Test Destination',
          labelerName: 'Test Manufacturer',
          totalItems: 5,
          totalAskValue: 1250.0,
          items: [
            { ndc: '12345-678-90', productName: 'Test Product A', quantity: 2, askPrice: 500.0 },
            { ndc: '98765-432-10', productName: 'Test Product B', quantity: 3, askPrice: 750.0 },
          ],
        })
      : buildRaReminderTestHtml({
          memoNumber: 'TEST-001',
          pharmacyName: 'Test Pharmacy',
          requestCount: 2,
          daysSinceRequest: 14,
        });

  const payload: { from: string; to: string; subject: string; html: string; reply_to?: string } = {
    from: FROM_EMAIL,
    to,
    subject,
    html,
  };
  if (REPLY_TO_EMAIL) payload.reply_to = REPLY_TO_EMAIL;

  const { data, error } = await resendClient.emails.send(payload as any);

  if (error) {
    throw new AppError(`Resend error: ${error.message}`, 500);
  }
  if (!data?.id) {
    throw new AppError('Resend did not return an email ID', 500);
  }

  return { emailId: data.id };
}

/**
 * Send real RA email via direct Resend API (fallback for Edge Function)
 */
export async function sendDirectRAEmail(
  templateType: 'ra-request' | 'ra-reminder',
  templateData: any,
  recipient: { to: string; name?: string },
  contactInfo?: { name?: string; email?: string; phone?: string }
): Promise<{ emailId: string }> {
  if (!resendClient) {
    throw new AppError(
      'RESEND_API_KEY is not set. Cannot send email via direct API.',
      500
    );
  }

  const { to, name } = recipient;
  const {
    memoNumber,
    pharmacyName,
    destination,
    labelerName,
    totalItems,
    totalAskValue,
    items = [],
    requestCount = 1,
    daysSinceRequest = 0
  } = templateData;

  let subject: string;
  let html: string;

  if (templateType === 'ra-request') {
    subject = `Return Authorization Request — ${memoNumber}`;
    html = buildRaRequestHtml({
      memoNumber,
      pharmacyName,
      destination: destination || 'N/A',
      labelerName: labelerName || 'Unknown Manufacturer',
      totalItems: totalItems || 0,
      totalAskValue: totalAskValue || 0,
      items,
      recipientName: name,
      contactInfo
    });
  } else {
    subject = `REMINDER: Return Authorization Request — ${memoNumber} (Follow-up #${requestCount})`;
    html = buildRaReminderHtml({
      memoNumber,
      pharmacyName,
      requestCount,
      daysSinceRequest,
      recipientName: name,
      contactInfo
    });
  }

  const payload: { from: string; to: string; subject: string; html: string; reply_to?: string } = {
    from: FROM_EMAIL,
    to,
    subject,
    html,
  };
  if (REPLY_TO_EMAIL) payload.reply_to = REPLY_TO_EMAIL;

  const { data, error } = await resendClient.emails.send(payload as any);

  if (error) {
    throw new AppError(`Resend error: ${error.message}`, 500);
  }
  if (!data?.id) {
    throw new AppError('Resend did not return an email ID', 500);
  }

  return { emailId: data.id };
}

/**
 * Build production HTML for RA request email
 */
function buildRaRequestHtml(data: {
  memoNumber: string;
  pharmacyName: string;
  destination: string;
  labelerName: string;
  totalItems: number;
  totalAskValue: number;
  items: Array<{ ndc: string; productName: string; quantity: number; askPrice: number }>;
  recipientName?: string;
  contactInfo?: { name?: string; email?: string; phone?: string };
}): string {
  const itemsRows = data.items
    .map(
      (i) =>
        `<tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${i.ndc}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${i.productName}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${i.quantity}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">$${i.askPrice.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const contactName = data.contactInfo?.name || 'Returns Department';
  const contactEmail = data.contactInfo?.email || '';
  const contactPhone = data.contactInfo?.phone || '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Return Authorization Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background-color: #1f2937; color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Return Authorization Request</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 24px 0; font-size: 16px;">
        Dear ${data.recipientName || 'Returns Department'},
      </p>
      
      <p style="margin: 0 0 24px 0;">
        We are requesting Return Authorization for the following items from our pharmacy return processing.
      </p>
      
      <!-- Memo Details -->
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">Request Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 140px;">Debit Memo:</td>
            <td style="padding: 4px 0;">${data.memoNumber}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Pharmacy:</td>
            <td style="padding: 4px 0;">${data.pharmacyName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Destination:</td>
            <td style="padding: 4px 0;">${data.destination}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Manufacturer:</td>
            <td style="padding: 4px 0;">${data.labelerName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Total Items:</td>
            <td style="padding: 4px 0;">${data.totalItems}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Total Ask Value:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #059669;">$${data.totalAskValue.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <!-- Items Table -->
      ${data.items.length > 0 ? `
      <h3 style="margin: 0 0 16px 0; color: #1f2937;">Items for Return Authorization</h3>
      <div style="overflow-x: auto; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: left; font-weight: bold;">NDC</th>
              <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: left; font-weight: bold;">Product Name</th>
              <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">Quantity</th>
              <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">Ask Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- Instructions -->
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-weight: bold; color: #1e40af;">Next Steps:</p>
        <p style="margin: 8px 0 0 0;">
          Please reply to this email with the Return Authorization number and any additional instructions for processing these returns.
        </p>
      </div>
      
      <p style="margin: 0 0 8px 0;">Thank you for your prompt attention to this request.</p>
      <p style="margin: 0;">Best regards,</p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">${contactName}</p>
        ${contactEmail ? `<p style="margin: 0 0 4px 0;">Email: <a href="mailto:${contactEmail}" style="color: #3b82f6;">${contactEmail}</a></p>` : ''}
        ${contactPhone ? `<p style="margin: 0 0 4px 0;">Phone: ${contactPhone}</p>` : ''}
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
          Please reply to this email for any questions or clarifications.
        </p>
      </div>
    </div>
    
  </div>
</body>
</html>`;
}

/**
 * Build production HTML for RA reminder email
 */
function buildRaReminderHtml(data: {
  memoNumber: string;
  pharmacyName: string;
  requestCount: number;
  daysSinceRequest: number;
  recipientName?: string;
  contactInfo?: { name?: string; email?: string; phone?: string };
}): string {
  const contactName = data.contactInfo?.name || 'Returns Department';
  const contactEmail = data.contactInfo?.email || '';
  const contactPhone = data.contactInfo?.phone || '';
  
  const urgencyColor = data.daysSinceRequest > 21 ? '#dc2626' : data.daysSinceRequest > 14 ? '#d97706' : '#059669';
  const urgencyText = data.daysSinceRequest > 21 ? 'URGENT' : data.daysSinceRequest > 14 ? 'ATTENTION NEEDED' : 'REMINDER';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RA Request Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background-color: ${urgencyColor}; color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${urgencyText}: RA Request Follow-up</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 24px 0; font-size: 16px;">
        Dear ${data.recipientName || 'Returns Department'},
      </p>
      
      <p style="margin: 0 0 24px 0;">
        This is follow-up #${data.requestCount} regarding our Return Authorization request for <strong>${data.memoNumber}</strong>.
      </p>
      
      <!-- Status Alert -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-weight: bold; color: #92400e;">Status Update:</p>
        <p style="margin: 8px 0 0 0; color: #92400e;">
          This request has been pending for ${data.daysSinceRequest} days. We kindly request your prompt response.
        </p>
      </div>
      
      <!-- Request Details -->
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">Original Request Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 140px;">Debit Memo:</td>
            <td style="padding: 4px 0;">${data.memoNumber}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Pharmacy:</td>
            <td style="padding: 4px 0;">${data.pharmacyName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Days Pending:</td>
            <td style="padding: 4px 0; color: ${urgencyColor}; font-weight: bold;">${data.daysSinceRequest} days</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Follow-up #:</td>
            <td style="padding: 4px 0;">${data.requestCount}</td>
          </tr>
        </table>
      </div>
      
      <!-- Action Required -->
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-weight: bold; color: #1e40af;">Action Required:</p>
        <p style="margin: 8px 0 0 0;">
          Please reply to this email with:
        </p>
        <ul style="margin: 8px 0 0 20px; color: #1e40af;">
          <li>Return Authorization number</li>
          <li>Any special instructions for processing</li>
          <li>Expected processing timeline</li>
        </ul>
      </div>
      
      <p style="margin: 0 0 8px 0;">We appreciate your prompt attention to this matter.</p>
      <p style="margin: 0;">Best regards,</p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">${contactName}</p>
        ${contactEmail ? `<p style="margin: 0 0 4px 0;">Email: <a href="mailto:${contactEmail}" style="color: #3b82f6;">${contactEmail}</a></p>` : ''}
        ${contactPhone ? `<p style="margin: 0 0 4px 0;">Phone: ${contactPhone}</p>` : ''}
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
          Please reply to this email or contact our returns department for assistance.
        </p>
      </div>
    </div>
    
  </div>
</body>
</html>`;
}
