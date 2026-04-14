// Supabase Edge Function: send-sub-admin-invite
// Sends an invitation email to a newly created sub-admin for the MainAdmin portal.
// Deploy:  npx supabase functions deploy send-sub-admin-invite --no-verify-jwt
//
// MAIN_ADMIN_PORTAL_URL — MainAdmin portal origin (no trailing slash), e.g. http://localhost:3003
// Set via: npx supabase secrets set MAIN_ADMIN_PORTAL_URL=https://your-mainadmin.example.com

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import nodemailer from 'npm:nodemailer@6';

interface SubAdminInvitePayload {
  to: string;
  name: string;
  inviteToken: string;
  permissions: string[];
  portalBaseUrl?: string;
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

function formatPermissions(permissions: string[]): string {
  if (!permissions || permissions.length === 0) return 'No specific tabs assigned';
  return permissions
    .map(p => p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    .join(', ');
}

function buildInviteHtml(data: SubAdminInvitePayload): string {
  const setupUrl = `${data.portalBaseUrl}/setup-account?token=${data.inviteToken}`;
  const permList = formatPermissions(data.permissions);

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
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Welcome to Main Admin Portal</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">You've been invited as a Sub-Admin</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                Hello <strong>${data.name || 'there'}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                You have been invited to the <strong>Main Admin Portal</strong> as a sub-administrator. To get started, please click the button below to create your login credentials.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" 
                       style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                      Set Up Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                <strong>Your assigned permissions:</strong>
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:13px;line-height:1.8;">
                ${permList}
              </p>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                <strong>What you'll do:</strong>
              </p>
              <ul style="margin:0 0 20px;padding-left:20px;color:#6b7280;font-size:13px;line-height:1.8;">
                <li>Create a secure password for your account</li>
                <li>Access the Main Admin portal immediately</li>
                <li>Your access is managed by the Main Administrator</li>
              </ul>

              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This invitation link will expire in <strong>7 days</strong>. If you didn't expect this email, please ignore it or contact your administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} Main Admin Portal — Buying Group Management
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
    const payload: SubAdminInvitePayload = await req.json();
    console.log('[send-sub-admin-invite] Received payload for:', payload.to);

    if (!payload.to || !payload.inviteToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, inviteToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    payload.portalBaseUrl = (
      getEnv('MAIN_ADMIN_PORTAL_URL') ||
      payload.portalBaseUrl ||
      'http://localhost:3003'
    ).replace(/\/$/, '');

    const smtpUser = getEnv('SMTP_USER');
    const smtpFrom = getEnv('SMTP_FROM_EMAIL');

    if (!smtpUser || !getEnv('SMTP_PASS')) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMTP credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transporter = buildTransporter();
    const html = buildInviteHtml(payload);

    const info = await transporter.sendMail({
      from: `"${getEnv('SMTP_FROM_NAME', 'Main Admin Portal')}" <${smtpFrom || smtpUser}>`,
      to: payload.to,
      subject: `You've Been Invited to Main Admin Portal — Set Up Your Account`,
      html,
      text: `Hello ${payload.name || 'there'},\n\nYou have been invited to the Main Admin Portal as a sub-administrator.\n\nPlease set up your account at: ${payload.portalBaseUrl}/setup-account?token=${payload.inviteToken}\n\nYour permissions: ${formatPermissions(payload.permissions)}\n\nThis link expires in 7 days.`,
    });

    console.log(`[send-sub-admin-invite] Email sent successfully, messageId: ${info.messageId}`);
    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[send-sub-admin-invite] Error:', err.message, err.stack);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
