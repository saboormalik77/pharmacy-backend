import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { AppError } from '../utils/appError';

// ============================================================
// Configuration
// ============================================================

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || '';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || process.env.CONTACT_NAME || 'Returns Department';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

let transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new AppError(
      'SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local',
      500
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

export function isSmtpConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM_EMAIL);
}

// ============================================================
// Core send function
// ============================================================

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<{ messageId: string }> {
  const t = getTransporter();

  const info = await t.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo || REPLY_TO || undefined,
  });

  return { messageId: info.messageId };
}

// ============================================================
// RA Request email
// ============================================================

export interface RARequestData {
  memoNumber: string;
  pharmacyName: string;
  destination?: string | null;
  labelerName?: string | null;
  totalItems?: number;
  totalAskValue?: number;
  items?: Array<{
    ndc: string;
    productName: string;
    quantity: number;
    askPrice: number;
    lotNumber?: string;
    expirationDate?: string;
  }>;
}

export async function sendRARequestEmail(
  to: string,
  data: RARequestData,
  recipientName?: string,
  contactInfo?: { name?: string; email?: string; phone?: string }
): Promise<{ messageId: string }> {
  const subject = `Return Authorization Request — ${data.memoNumber}`;
  const html = buildRARequestHtml(data, recipientName, contactInfo);
  return sendMail({ to, subject, html });
}

// ============================================================
// RA Reminder email
// ============================================================

export interface RAReminderData {
  memoNumber: string;
  pharmacyName: string;
  requestCount?: number;
  daysSinceRequest?: number;
  originalDate?: string | null;
  // Enhanced data for complete RA information
  destination?: string | null;
  labelerName?: string | null;
  totalItems?: number;
  totalAskValue?: number;
  items?: Array<{
    ndc: string;
    productName: string;
    quantity: number;
    askPrice: number;
    lotNumber?: string;
    expirationDate?: string;
  }>;
}

export async function sendRAReminderEmail(
  to: string,
  data: RAReminderData,
  recipientName?: string,
  contactInfo?: { name?: string; email?: string; phone?: string }
): Promise<{ messageId: string }> {
  const count = data.requestCount || 1;
  const subject = `REMINDER: Return Authorization Request — ${data.memoNumber} (Follow-up #${count})`;
  const html = buildRAReminderHtml(data, recipientName, contactInfo);
  return sendMail({ to, subject, html });
}

// ============================================================
// Test email
// ============================================================

export async function sendTestEmail(
  to: string,
  templateType: 'ra-request' | 'ra-reminder'
): Promise<{ messageId: string }> {
  if (templateType === 'ra-request') {
    return sendRARequestEmail(
      to,
      {
        memoNumber: 'TEST-001',
        pharmacyName: 'Test Pharmacy',
        destination: 'Test Destination',
        labelerName: 'Test Manufacturer',
        totalItems: 3,
        totalAskValue: 1250.0,
        items: [
          { ndc: '12345-678-90', productName: 'Test Product A', quantity: 2, askPrice: 500.0 },
          { ndc: '98765-432-10', productName: 'Test Product B', quantity: 1, askPrice: 750.0 },
        ],
      },
      'Returns Department',
      {
        name: process.env.CONTACT_NAME || 'Returns Department',
        email: process.env.CONTACT_EMAIL || '',
        phone: process.env.CONTACT_PHONE || '',
      }
    );
  }

  return sendRAReminderEmail(
    to,
    {
      memoNumber: 'TEST-001',
      pharmacyName: 'Test Pharmacy',
      requestCount: 2,
      daysSinceRequest: 14,
      originalDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    'Returns Department',
    {
      name: process.env.CONTACT_NAME || 'Returns Department',
      email: process.env.CONTACT_EMAIL || '',
      phone: process.env.CONTACT_PHONE || '',
    }
  );
}

// ============================================================
// HTML builders
// ============================================================

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function buildRARequestHtml(
  data: RARequestData,
  recipientName?: string,
  contactInfo?: { name?: string; email?: string; phone?: string }
): string {
  const items = data.items || [];
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${i.ndc}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${i.productName}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmt(i.askPrice)}</td>
        ${i.lotNumber ? `<td style="padding:8px;border:1px solid #e5e7eb;">${i.lotNumber}</td>` : ''}
        ${i.expirationDate ? `<td style="padding:8px;border:1px solid #e5e7eb;">${i.expirationDate}</td>` : ''}
      </tr>`
    )
    .join('');

  const hasLot = items.some((i) => i.lotNumber);
  const hasExp = items.some((i) => i.expirationDate);
  const cName = contactInfo?.name || 'Returns Department';
  const cEmail = contactInfo?.email || '';
  const cPhone = contactInfo?.phone || '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;color:#374151;background:#f9fafb;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden;">
  <div style="background:#1f2937;color:#fff;padding:24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;">Return Authorization Request</h1>
  </div>
  <div style="padding:32px;">
    <p>Dear ${recipientName || 'Returns Department'},</p>
    <p>We are requesting Return Authorization for the following items from our pharmacy return processing.</p>
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
    <h3>Items for Return Authorization</h3>
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:left;">NDC</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:left;">Product</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:center;">Qty</th>
          <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;">Ask Price</th>
          ${hasLot ? '<th style="padding:10px 8px;border:1px solid #e5e7eb;">Lot #</th>' : ''}
          ${hasExp ? '<th style="padding:10px 8px;border:1px solid #e5e7eb;">Exp Date</th>' : ''}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>` : ''}
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-weight:bold;color:#1e40af;">Next Steps:</p>
      <p style="margin:8px 0 0;">Please reply to this email with the Return Authorization number and any additional processing instructions.</p>
    </div>
    <p>Thank you for your prompt attention.</p>
    <p>Best regards,</p>
  </div>
  <div style="background:#f9fafb;padding:24px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;">
    <p style="margin:0 0 6px;font-weight:bold;">${cName}</p>
    ${cEmail ? `<p style="margin:0 0 4px;">Email: <a href="mailto:${cEmail}" style="color:#3b82f6;">${cEmail}</a></p>` : ''}
    ${cPhone ? `<p style="margin:0 0 4px;">Phone: ${cPhone}</p>` : ''}
  </div>
</div>
</body></html>`;
}

function buildRAReminderHtml(
  data: RAReminderData,
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
          ${items.some(i => i.lotNumber) ? '<th style="padding:10px 8px;border:1px solid #e5e7eb;font-size:12px;">Lot #</th>' : ''}
          ${items.some(i => i.expirationDate) ? '<th style="padding:10px 8px;border:1px solid #e5e7eb;font-size:12px;">Exp Date</th>' : ''}
        </tr></thead>
        <tbody>
          ${items.map(item => `<tr>
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
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
    ${cEmail ? `<p style="margin:0 0 4px;">Email: <a href="mailto:${cEmail}" style="color:#3b82f6;">${cEmail}</a></p>` : ''}
    ${cPhone ? `<p style="margin:0 0 4px;">Phone: ${cPhone}</p>` : ''}
  </div>
</div>
</body></html>`;
}