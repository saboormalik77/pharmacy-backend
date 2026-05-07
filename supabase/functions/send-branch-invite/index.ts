// Supabase Edge Function: send-branch-invite
// Sends an invitation email to a branch pharmacy created by a parent pharmacy.
// Deploy:  npx supabase functions deploy send-branch-invite --no-verify-jwt
//
// PHARMACY_PORTAL_URL — pharmacy portal origin (no trailing slash), e.g. http://localhost:3001
// Set via: supabase secrets set PHARMACY_PORTAL_URL=http://localhost:3001

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import nodemailer from 'npm:nodemailer@6';

interface BranchInvitePayload {
  to: string;
  pharmacyName: string;
  contactName: string;
  inviteToken: string;
  portalBaseUrl: string;
  parentPharmacyName?: string;
}

function getEnv(key: string, fallback = ''): string {
  return Deno.env.get(key) ?? fallback;
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: getEnv('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(getEnv('SMTP_PORT', '587'), 10),
    secure: getEnv('SMTP_SECURE', 'false') === 'true',
    auth: {
      user: getEnv('SMTP_USER'),
      pass: getEnv('SMTP_PASS'),
    },
  });
}

function buildBranchInviteHtml(data: BranchInvitePayload): string {
  const setupUrl = `${data.portalBaseUrl}/setup-account?token=${data.inviteToken}&type=branch`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#14b8a6 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Your Branch Account is Ready</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">PharmAdmin — Pharmacy Returns Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                Hello <strong>${data.contactName || 'there'}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                A branch pharmacy account for <strong>${data.pharmacyName}</strong> has been created for you${data.parentPharmacyName ? ' by <strong>' + data.parentPharmacyName + '</strong>' : ''}. To get started, please set your password by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" 
                       style="display:inline-block;background:linear-gradient(135deg,#0d9488 0%,#14b8a6 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>


              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                <strong>What happens next:</strong>
              </p>
              <ul style="margin:0 0 20px;padding-left:20px;color:#6b7280;font-size:13px;line-height:1.8;">
                <li>Set a secure password for your account</li>
                <li>Access the pharmacy portal immediately</li>
                <li>Your permissions are managed by your pharmacy administrator</li>
              </ul>

              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This invitation link will expire in <strong>7 days</strong>. If you didn't expect this email, please contact your pharmacy administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} PharmAdmin — Pharmacy Returns Management
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: BranchInvitePayload = await req.json();

    if (!payload.to || !payload.inviteToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, inviteToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    payload.portalBaseUrl = (
      payload.portalBaseUrl ||
      getEnv('PHARMACY_PORTAL_URL') ||
      'http://localhost:3001'
    ).replace(/\/$/, '');

    const transporter = buildTransporter();
    const html = buildBranchInviteHtml(payload);

    const info = await transporter.sendMail({
      from: `"${getEnv('SMTP_FROM_NAME', 'PharmAdmin')}" <${getEnv('SMTP_FROM_EMAIL')}>`,
      to: payload.to,
      subject: `Your Branch Account Has Been Created — Set Your Password`,
      html,
      text: `Hello ${payload.contactName || 'there'},\n\nA branch pharmacy account for ${payload.pharmacyName} has been created for you${payload.parentPharmacyName ? ' by ' + payload.parentPharmacyName : ''}.\n\nPlease set your password at: ${payload.portalBaseUrl}/setup-account?token=${payload.inviteToken}&type=branch\n\nThis link expires in 7 days.`,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('send-branch-invite error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
