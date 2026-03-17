import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    tags?: Array<{
      name: string;
      value: string;
    }>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature (optional but recommended for production)
    const signature = req.headers.get('resend-signature')
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    
    if (webhookSecret && signature) {
      // TODO: Implement signature verification
      // This would involve HMAC verification of the request body
      console.log('Webhook signature verification not implemented yet')
    }

    const event: ResendWebhookEvent = await req.json()
    
    console.log(`Received Resend webhook: ${event.type} for email ${event.data.email_id}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Map Resend event types to our status values
    const statusMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'sent', // Keep as sent, just delayed
      'email.complained': 'complained',
      'email.bounced': 'bounced'
    }

    const status = statusMap[event.type] || 'unknown'
    
    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Set specific timestamps based on event type
    if (event.type === 'email.delivered') {
      updateData.delivered_at = event.created_at
    } else if (event.type === 'email.bounced') {
      updateData.bounced_at = event.created_at
    }

    // Update email_logs table
    const { data: emailLogData, error: emailLogError } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('resend_email_id', event.data.email_id)
      .select()

    if (emailLogError) {
      console.error('Error updating email_logs:', emailLogError)
    } else {
      console.log(`Updated email_logs for email ${event.data.email_id}:`, emailLogData)
    }

    // Also call the RPC function to update status
    const { error: rpcError } = await supabase.rpc('log_email_status', {
      p_resend_email_id: event.data.email_id,
      p_status: status,
      p_delivered_at: event.type === 'email.delivered' ? event.created_at : null,
      p_bounced_at: event.type === 'email.bounced' ? event.created_at : null,
      p_error_message: event.type === 'email.bounced' || event.type === 'email.complained' 
        ? `Email ${event.type.replace('email.', '')}` 
        : null
    })

    if (rpcError) {
      console.error('Error calling log_email_status RPC:', rpcError)
    }

    // For bounced or complained emails, we might want to take additional action
    if (event.type === 'email.bounced' || event.type === 'email.complained') {
      console.log(`⚠️ Email issue detected: ${event.type} for ${event.data.email_id}`)
      
      // Find the memo number from tags
      const memoTag = event.data.tags?.find(tag => tag.name === 'memo')
      if (memoTag) {
        console.log(`📋 Affected memo: ${memoTag.value}`)
        // TODO: Implement additional handling like:
        // - Notify admins
        // - Flag the RA request for manual follow-up
        // - Update the RA request status
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Webhook processed successfully for email ${event.data.email_id}`,
        event_type: event.type,
        status: status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error processing Resend webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})