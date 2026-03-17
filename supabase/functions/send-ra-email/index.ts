import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  memoNumber: string;
  from?: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, memoNumber, from, replyTo }: EmailRequest = await req.json()

    // Validate required fields
    if (!to || !subject || !html || !memoNumber) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: to, subject, html, memoNumber' 
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
    const replyToEmail = replyTo || Deno.env.get('REPLY_TO_EMAIL') || 'support@fcr-system.com'

    console.log(`Sending RA email for memo ${memoNumber} to ${to}`)

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        reply_to: replyToEmail,
        subject: subject,
        html: html,
        tags: [
          { name: 'type', value: 'ra-request' },
          { name: 'memo', value: memoNumber }
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
        message: `RA request email sent for memo ${memoNumber}`,
        data: resendData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in send-ra-email function:', error)
    
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