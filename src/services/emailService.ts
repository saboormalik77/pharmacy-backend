import { sendMail, isSmtpConfigured } from './nodemailerService';

/**
 * Check if email service is configured
 */
export const isEmailConfigured = (): boolean => {
  return isSmtpConfigured();
};

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using Nodemailer (SMTP)
 */
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  if (!isSmtpConfigured()) {
    console.error('[EmailService] Cannot send email - SMTP not configured');
    return false;
  }

  try {
    const result = await sendMail({
      to: options.to,
      subject: options.subject,
      html: options.html || options.text || '',
      text: options.text,
    });

    console.log(`[EmailService] Email sent to ${options.to}, messageId: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error);
    return false;
  }
};

/**
 * Send admin password reset email
 */
export const sendAdminPasswordResetEmail = async (
  email: string,
  name: string,
  resetLink: string
): Promise<boolean> => {
  const subject = 'Reset Your Admin Password - Pharma Collect';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        
        <div style="background-color: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
          
          <p style="color: #666; font-size: 15px;">
            We received a request to reset your admin account password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              Reset Password
            </a>
          </div>
          
          <p style="color: #888; font-size: 13px; margin-top: 20px;">
            Or copy and paste this link into your browser:
            <br>
            <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 13px;">
            This link will expire in <strong>1 hour</strong>.
            <br><br>
            If you didn't request this password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Pharma Collect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello ${name},

We received a request to reset your admin account password.

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

© ${new Date().getFullYear()} Pharma Collect. All rights reserved.
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};

/**
 * Send pharmacy password reset email
 */
export const sendPharmacyPasswordResetEmail = async (
  email: string,
  name: string,
  resetLink: string
): Promise<boolean> => {
  const subject = 'Reset Your Password - Pharma Collect';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        
        <div style="background-color: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
          
          <p style="color: #666; font-size: 15px;">
            We received a request to reset your pharmacy account password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
              Reset Password
            </a>
          </div>
          
          <p style="color: #888; font-size: 13px; margin-top: 20px;">
            Or copy and paste this link into your browser:
            <br>
            <a href="${resetLink}" style="color: #10b981; word-break: break-all;">${resetLink}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 13px;">
            This link will expire in <strong>1 hour</strong>.
            <br><br>
            If you didn't request this password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Pharma Collect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello ${name},

We received a request to reset your pharmacy account password.

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

© ${new Date().getFullYear()} Pharma Collect. All rights reserved.
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};

/**
 * Send inventory reminder email
 */
export const sendInventoryReminderEmail = async (
  email: string,
  pharmacyName: string,
  totalItems: number,
  totalPotentialValue: number,
  topItems: Array<{
    ndcCode: string;
    productName: string;
    estimatedValue: number;
    distributor?: string;
  }>,
  dashboardLink: string
): Promise<boolean> => {
  const subject = `Inventory Reminder: $${totalPotentialValue.toFixed(2)} in Potential Returns - Pharma Collect`;

  const itemsHtml = topItems.slice(0, 5).map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eef2f7;">
        <strong style="color: #1a1a1a;">${item.productName || 'Unknown Product'}</strong><br>
        <span style="color: #666; font-size: 13px;">NDC: ${item.ndcCode}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eef2f7; text-align: right;">
        <strong style="color: #10b981;">$${item.estimatedValue.toFixed(2)}</strong><br>
        <span style="color: #666; font-size: 12px;">${item.distributor || 'Best distributor'}</span>
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f7fa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 26px;">Inventory Reminder</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You still have products that could be returned!</p>
        </div>
        <div style="background-color: white; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <p style="color: #333; font-size: 16px;">Hi <strong>${pharmacyName}</strong>,</p>
          <p style="color: #555;">You still have <strong>${totalItems} products</strong> that could be returned for credit:</p>
          <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
            <p style="margin: 0; color: #166534; font-size: 14px; text-transform: uppercase;">Total Potential Value</p>
            <p style="margin: 8px 0 0 0; color: #059669; font-size: 42px; font-weight: bold;">$${totalPotentialValue.toFixed(2)}</p>
          </div>
          <p style="color: #333;"><strong>Top Products to Return:</strong></p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead><tr style="background-color: #f8fafc;">
              <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px;">Product</th>
              <th style="padding: 12px; text-align: right; color: #64748b; font-size: 12px;">Est. Value</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 45px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              View All Recommendations
            </a>
          </div>
          <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #854d0e; font-size: 14px;"><strong>Pro Tip:</strong> Return products before they expire to maximize your return value.</p>
          </div>
        </div>
        <div style="text-align: center; padding: 25px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Pharma Collect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const itemsText = topItems.slice(0, 5).map(item => 
    `- ${item.productName || 'Unknown'} (${item.ndcCode}): $${item.estimatedValue.toFixed(2)}`
  ).join('\n');

  const text = `
Inventory Return Reminder - Pharma Collect

Hi ${pharmacyName},

You still have ${totalItems} products that could be returned for credit.

TOTAL POTENTIAL VALUE: $${totalPotentialValue.toFixed(2)}

Top Products to Return:
${itemsText}

View recommendations: ${dashboardLink}

© ${new Date().getFullYear()} Pharma Collect. All rights reserved.
  `;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Send expiration warning email
 */
export const sendExpirationWarningEmail = async (
  email: string,
  pharmacyName: string,
  expiringItems: Array<{
    ndcCode: string;
    productName: string;
    expirationDate: string;
    estimatedValue: number;
  }>,
  dashboardLink: string
): Promise<boolean> => {
  const totalValue = expiringItems.reduce((sum, item) => sum + item.estimatedValue, 0);
  const subject = `${expiringItems.length} Products Expiring Soon - Return Before They Lose Value`;

  const itemsHtml = expiringItems.slice(0, 10).map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #fef2f2;">
        <strong>${item.productName || 'Unknown'}</strong><br>
        <span style="color: #666; font-size: 13px;">NDC: ${item.ndcCode}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #fef2f2; text-align: center;">
        <span style="color: #dc2626; font-weight: bold;">${item.expirationDate}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #fef2f2; text-align: right;">
        <strong style="color: #10b981;">$${item.estimatedValue.toFixed(2)}</strong>
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 35px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 26px;">Expiration Warning</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Act now before these products lose value!</p>
        </div>
        <div style="background-color: white; padding: 35px; border-radius: 0 0 12px 12px;">
          <p style="color: #333;">Hi <strong>${pharmacyName}</strong>,</p>
          <p style="color: #555;"><strong style="color: #dc2626;">${expiringItems.length} products</strong> are expiring soon! Return them now for <strong style="color: #10b981;">$${totalValue.toFixed(2)}</strong>.</p>
          <div style="background: #fef2f2; border: 2px solid #fecaca; padding: 20px; margin: 25px 0; border-radius: 12px;">
            <p style="margin: 0; color: #991b1b;"><strong>Time is running out!</strong> Expired products cannot be returned for credit.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead><tr style="background-color: #fef2f2;">
              <th style="padding: 12px; text-align: left; color: #991b1b; font-size: 12px;">Product</th>
              <th style="padding: 12px; text-align: center; color: #991b1b; font-size: 12px;">Expires</th>
              <th style="padding: 12px; text-align: right; color: #991b1b; font-size: 12px;">Value</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 45px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Return These Products Now
            </a>
          </div>
        </div>
        <div style="text-align: center; padding: 25px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Pharma Collect</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Expiration Warning\n\n${expiringItems.length} products expiring soon.\nTotal value: $${totalValue.toFixed(2)}\n\nTake action: ${dashboardLink}`;

  return sendEmail({ to: email, subject, html, text });
};
