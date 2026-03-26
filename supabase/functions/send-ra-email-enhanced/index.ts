import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface EmailRequest {
  templateType: 'ra-request' | 'ra-reminder';
  templateData: {
    memoNumber: string;
    pharmacyName: string;
    destination?: string;
    labelerName?: string;
    totalItems?: number;
    totalAskValue?: number;
    items?: Array<{
      ndc: string;
      productName: string;
      quantity: number;
      askPrice: number;
    }>;
    requestCount?: number;
    originalDate?: string;
    daysSinceRequest?: number;
  };
  recipient: {
    to: string;
    name?: string;
  };
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  from?: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

// Simple React-like template rendering for Deno
const renderRARequestTemplate = (data: any) => {
  const { memoNumber, pharmacyName, destination, labelerName, totalItems, totalAskValue, items = [], contactInfo } = data;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const itemsHtml = items.slice(0, 10).map((item: any, index: number) => `
    <div style="margin-bottom: 16px; padding: 12px; background-color: #f9fafb; border-radius: 6px;">
      <div style="margin-bottom: 4px;">
        <span style="color: #6b7280; font-size: 12px; font-weight: 500; display: inline-block; width: 80px;">NDC:</span>
        <span style="color: #374151; font-size: 12px;">${item.ndc}</span>
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #6b7280; font-size: 12px; font-weight: 500; display: inline-block; width: 80px;">Product:</span>
        <span style="color: #374151; font-size: 12px;">${item.productName}</span>
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #6b7280; font-size: 12px; font-weight: 500; display: inline-block; width: 80px;">Quantity:</span>
        <span style="color: #374151; font-size: 12px;">${item.quantity.toLocaleString()}</span>
      </div>
      <div>
        <span style="color: #6b7280; font-size: 12px; font-weight: 500; display: inline-block; width: 80px;">Ask Price:</span>
        <span style="color: #374151; font-size: 12px;">${formatCurrency(item.askPrice)}</span>
      </div>
    </div>
  `).join('');

  const moreItemsNote = items.length > 10 ? `
    <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0; font-style: italic;">
      ... and ${items.length - 10} more items. Please see attached debit memo for complete details.
    </p>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RA Request for Debit Memo ${memoNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
      <div style="background-color: #ffffff; margin: 0 auto; padding: 20px 0 48px; margin-bottom: 64px; max-width: 600px;">
        
        <!-- Header -->
        <div style="padding: 32px 24px; background-color: #1f2937; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 8px;">
            Return Authorization Request
          </h1>
          <p style="color: #d1d5db; font-size: 16px; margin: 0;">
            Debit Memo: ${memoNumber}
          </p>
        </div>

        <!-- Memo Details -->
        <div style="padding: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 16px;">
            Memo Information
          </h2>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Debit Memo:</span>
            <span style="color: #1f2937; font-size: 14px;">${memoNumber}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Pharmacy:</span>
            <span style="color: #1f2937; font-size: 14px;">${pharmacyName}</span>
          </div>
          
          ${destination ? `
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Destination:</span>
            <span style="color: #1f2937; font-size: 14px;">${destination}</span>
          </div>
          ` : ''}
          
          ${labelerName ? `
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Manufacturer:</span>
            <span style="color: #1f2937; font-size: 14px;">${labelerName}</span>
          </div>
          ` : ''}
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Total Items:</span>
            <span style="color: #1f2937; font-size: 14px;">${totalItems?.toLocaleString() || 'N/A'}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Total Ask Value:</span>
            <span style="color: #059669; font-size: 14px; font-weight: bold;">${totalAskValue ? formatCurrency(totalAskValue) : 'N/A'}</span>
          </div>
        </div>

        <hr style="border-color: #e5e7eb; margin: 20px 0;">

        ${items.length > 0 ? `
        <!-- Items List -->
        <div style="padding: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 16px;">
            Items for Return
          </h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">
            The following items are included in this return request:
          </p>
          
          ${itemsHtml}
          ${moreItemsNote}
        </div>

        <hr style="border-color: #e5e7eb; margin: 20px 0;">
        ` : ''}

        <!-- Request Action -->
        <div style="padding: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 16px;">
            Action Required
          </h2>
          <p style="color: #1f2937; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
            Please provide a Return Authorization (RA) number for this debit memo to proceed with the return shipment.
          </p>
          <p style="color: #1f2937; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
            Reply to this email with the RA number and any additional instructions.
          </p>
        </div>

        <!-- Contact Information -->
        <div style="padding: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 16px;">
            Contact Information
          </h2>
          ${contactInfo?.name ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            <strong>Contact:</strong> ${contactInfo.name}
          </p>
          ` : ''}
          ${contactInfo?.email ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            <strong>Email:</strong> ${contactInfo.email}
          </p>
          ` : ''}
          ${contactInfo?.phone ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            <strong>Phone:</strong> ${contactInfo.phone}
          </p>
          ` : ''}
          ${!contactInfo?.name && !contactInfo?.email && !contactInfo?.phone ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            Please reply to this email for any questions or clarifications.
          </p>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-align: center;">
            This is an automated request from the First Class Returns system.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
            Generated on ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const renderRAReminderTemplate = (data: any) => {
  const { memoNumber, pharmacyName, requestCount, originalDate, daysSinceRequest, contactInfo } = data;
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUrgencyLevel = () => {
    if (daysSinceRequest >= 30) return 'high';
    if (daysSinceRequest >= 21) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();
  const urgencyColor = urgencyLevel === 'high' ? '#dc2626' : urgencyLevel === 'medium' ? '#d97706' : '#059669';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>REMINDER: RA Request for Debit Memo ${memoNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
      <div style="background-color: #ffffff; margin: 0 auto; padding: 20px 0 48px; margin-bottom: 64px; max-width: 600px;">
        
        <!-- Header -->
        <div style="padding: 32px 24px; background-color: #dc2626; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 8px;">
            Return Authorization Reminder
          </h1>
          <p style="color: #fecaca; font-size: 16px; margin: 0;">
            Follow-up Request #${requestCount}
          </p>
        </div>

        <!-- Urgency Banner -->
        <div style="padding: 12px 24px; text-align: center; background-color: ${urgencyColor};">
          <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0;">
            ${urgencyLevel === 'high' ? '🚨 URGENT: ' : urgencyLevel === 'medium' ? '⚠️ ATTENTION: ' : '📋 REMINDER: '}
            RA request pending for ${daysSinceRequest} days
          </p>
        </div>

        <!-- Memo Details -->
        <div style="padding: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 16px;">
            Outstanding RA Request
          </h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            We are following up on our Return Authorization request for the following debit memo:
          </p>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Debit Memo:</span>
            <span style="color: #dc2626; font-size: 14px; font-weight: bold;">${memoNumber}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Pharmacy:</span>
            <span style="color: #1f2937; font-size: 14px;">${pharmacyName}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Original Request:</span>
            <span style="color: #1f2937; font-size: 14px;">${formatDate(originalDate)}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Days Pending:</span>
            <span style="color: ${urgencyColor}; font-size: 14px; font-weight: bold;">${daysSinceRequest} days</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Request Count:</span>
            <span style="color: #1f2937; font-size: 14px;">#${requestCount}</span>
          </div>
        </div>

        <hr style="border-color: #e5e7eb; margin: 20px 0;">

        <!-- Action Required -->
        <div style="padding: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 16px;">
            Action Required
          </h2>
          <p style="color: #1f2937; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
            <strong>We need your Return Authorization (RA) number to proceed with this return shipment.</strong>
          </p>
          <p style="color: #1f2937; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
            Please reply to this email with:
          </p>
          <ul style="color: #374151; font-size: 14px; line-height: 1.6; margin: 12px 0; padding-left: 20px;">
            <li style="margin: 4px 0;">The RA number for debit memo ${memoNumber}</li>
            <li style="margin: 4px 0;">Any specific shipping instructions</li>
            <li style="margin: 4px 0;">Expected processing timeline</li>
          </ul>
          
          ${urgencyLevel === 'high' ? `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 14px; line-height: 1.6; margin: 16px 0; padding: 12px;">
            <strong>URGENT:</strong> This request has been pending for over 30 days. 
            Please prioritize this return to avoid delays in our processing workflow.
          </div>
          ` : ''}
          
          ${urgencyLevel === 'medium' ? `
          <div style="background-color: #fffbeb; border: 1px solid #fed7aa; border-radius: 6px; color: #d97706; font-size: 14px; line-height: 1.6; margin: 16px 0; padding: 12px;">
            <strong>ATTENTION:</strong> This request has been pending for over 3 weeks. 
            Your prompt response would be greatly appreciated.
          </div>
          ` : ''}
        </div>

        <hr style="border-color: #e5e7eb; margin: 20px 0;">

        <!-- Contact Information -->
        <div style="padding: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 16px;">
            Need Assistance?
          </h2>
          ${contactInfo?.name ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            <strong>Contact:</strong> ${contactInfo.name}
          </p>
          ` : ''}
          ${contactInfo?.email ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            <strong>Email:</strong> ${contactInfo.email}
          </p>
          ` : ''}
          ${contactInfo?.phone ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            <strong>Phone:</strong> ${contactInfo.phone}
          </p>
          ` : ''}
          ${!contactInfo?.name && !contactInfo?.email && !contactInfo?.phone ? `
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            Please reply to this email or contact our returns department for assistance.
          </p>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">
            If you have any questions about this debit memo or need assistance with the RA process, 
            please don't hesitate to reach out.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-align: center;">
            This is an automated reminder from the First Class Returns system.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
            Generated on ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { templateType, templateData, recipient, contactInfo, from, replyTo }: EmailRequest = await req.json()

    // Validate required fields
    if (!templateType || !templateData || !recipient?.to) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: templateType, templateData, recipient.to' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get email configuration from environment
    const fromEmail = from || Deno.env.get('FROM_EMAIL') || 'ra-requests@fcr-system.com'
    const replyToEmail = replyTo || Deno.env.get('SMTP_USER') || Deno.env.get('REPLY_TO_EMAIL') || 'support@fcr-system.com'

    // Render the appropriate template
    let html: string;
    let subject: string;

    if (templateType === 'ra-request') {
      html = renderRARequestTemplate({ ...templateData, contactInfo });
      subject = `RA Request: Debit Memo ${templateData.memoNumber} - ${templateData.pharmacyName}`;
    } else if (templateType === 'ra-reminder') {
      html = renderRAReminderTemplate({ ...templateData, contactInfo });
      
      const daysSinceRequest = templateData.daysSinceRequest || 0;
      let urgencyPrefix = '';
      if (daysSinceRequest >= 30) {
        urgencyPrefix = 'URGENT - ';
      } else if (daysSinceRequest >= 21) {
        urgencyPrefix = 'REMINDER - ';
      }
      
      subject = `${urgencyPrefix}RA Request Follow-up #${templateData.requestCount}: ${templateData.memoNumber} - ${templateData.pharmacyName}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid templateType. Must be "ra-request" or "ra-reminder"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Sending ${templateType} email for memo ${templateData.memoNumber} to ${recipient.to}`)

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient.to],
        reply_to: replyToEmail,
        subject: subject,
        html: html,
        tags: [
          { name: 'type', value: templateType },
          { name: 'memo', value: templateData.memoNumber }
        ]
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('Resend API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email via Resend',
          details: errorText,
          status: resendResponse.status
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const resendData: ResendResponse = await resendResponse.json()
    
    console.log(`Email sent successfully: ${resendData.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id,
        message: `${templateType} email sent for memo ${templateData.memoNumber}`,
        data: resendData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in send-ra-email-enhanced function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})