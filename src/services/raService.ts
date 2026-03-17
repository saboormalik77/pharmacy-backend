import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

function ensureAdmin() {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);
  return supabaseAdmin;
}

function handleRpcError(data: any, rpcError: any, label: string) {
  if (rpcError) throw new AppError(`${label}: ${rpcError.message}`, 400);
  if (!data) throw new AppError(`${label}: no data returned`, 500);
  if (data.error) throw new AppError(data.message || label, data.code || 400);
}

// ============================================================
// Interfaces
// ============================================================

export interface RARequest {
  id: string;
  debitMemoId: string;
  requestType: 'initial' | 'reminder' | 'resend';
  destinationEmail: string | null;
  destinationName: string | null;
  subject: string | null;
  bodyPreview: string | null;
  status: 'sent' | 'failed' | 'bounced';
  sentBy: string | null;
  sentAt: string;
  errorMessage: string | null;
  createdAt: string;
  /** Resend API email id, set after sending via Resend */
  resend_email_id?: string | null;
}

export interface RAEmailTemplate {
  to: string | null;
  toName: string | null;
  subject: string;
  body: string;
  memoNumber: string;
  pharmacyName: string;
  destination: string | null;
  labelerName: string | null;
  totalItems: number;
  totalAskValue: number;
  items?: any[];
}

export interface RAReminderTemplate {
  to: string | null;
  toName: string | null;
  subject: string;
  body: string;
  memoNumber: string;
  pharmacyName: string;
  requestCount: number;
  originalDate: string | null;
}

export interface RATrackingSummary {
  pending: number;
  requested: number;
  received: number;
  shipped: number;
  overdue: number;
}

// ============================================================
// Email sending functionality
// ============================================================

export const sendRAEmail = async (emailData: RAEmailTemplate): Promise<any> => {
  const sb = ensureAdmin();
  
  const { data, error } = await sb.functions.invoke('send-ra-email', {
    body: {
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.body,
      memoNumber: emailData.memoNumber
    }
  });
  
  if (error) throw new AppError(`Failed to send RA email: ${error.message}`, 500);
  if (!data?.success) throw new AppError(`Email sending failed: ${data?.error || 'Unknown error'}`, 500);
  
  return data;
};

export const sendEnhancedRAEmail = async (
  templateType: 'ra-request' | 'ra-reminder',
  templateData: any,
  recipient: { to: string; name?: string },
  contactInfo?: { name?: string; email?: string; phone?: string }
): Promise<any> => {
  const sb = ensureAdmin();
  
  try {
    // Try Edge Function first
    const { data, error } = await sb.functions.invoke('send-ra-email-enhanced', {
      body: {
        templateType,
        templateData,
        recipient,
        contactInfo
      }
    });
    
    if (error) {
      console.warn('Edge Function failed, falling back to direct Resend API:', error.message);
      throw new Error('Edge Function failed');
    }
    
    if (!data?.success) {
      console.warn('Edge Function returned error, falling back to direct Resend API:', data?.error);
      throw new Error('Edge Function returned error');
    }
    
    return data;
  } catch (edgeFunctionError: any) {
    console.log('Falling back to direct Resend API due to Edge Function error:', edgeFunctionError.message);
    
    // Fallback: Use direct Resend API
    try {
      const { sendDirectRAEmail } = await import('./resendRaEmailService');
      const result = await sendDirectRAEmail(templateType, templateData, recipient, contactInfo);
      
      console.log('Successfully sent email via direct Resend API fallback');
      return {
        success: true,
        emailId: result.emailId,
        message: 'Email sent via direct API (Edge Function unavailable)'
      };
    } catch (fallbackError: any) {
      throw new AppError(`Both Edge Function and direct API failed: ${fallbackError.message}`, 500);
    }
  }
};

// ============================================================
// RA Request operations
// ============================================================

export const sendRARequest = async (
  debitMemoId: string,
  sentBy?: string,
  emailOverride?: string
): Promise<{ memo: any; request: RARequest }> => {
  const sb = ensureAdmin();
  
  // First, generate the RA request and get the email template
  const { data, error } = await sb.rpc('ra_send_request', {
    p_debit_memo_id: debitMemoId,
    p_sent_by: sentBy || null,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to create RA request');
  
  const result = data.data as { memo: any; request: RARequest };
  
  // Generate email template
  let emailTemplate: RAEmailTemplate;
  try {
    emailTemplate = await generateRequestEmail(debitMemoId, emailOverride);
  } catch (templateError: any) {
    console.error('Failed to generate email template:', templateError.message);
    throw new AppError(`Failed to generate email template: ${templateError.message}`, 500);
  }
  
  // Send the enhanced email
  try {
    const contactInfo = {
      name: process.env.CONTACT_NAME || 'Returns Department',
      email: process.env.CONTACT_EMAIL || 'returns@fcr-system.com',
      phone: process.env.CONTACT_PHONE || undefined
    };

    const enhancedTemplateData = {
      memoNumber: emailTemplate.memoNumber,
      pharmacyName: emailTemplate.pharmacyName,
      destination: emailTemplate.destination,
      labelerName: emailTemplate.labelerName,
      totalItems: emailTemplate.totalItems,
      totalAskValue: emailTemplate.totalAskValue,
      items: emailTemplate.items || []
    };

    console.log(`Attempting to send RA email for memo ${emailTemplate.memoNumber} to ${emailTemplate.to}`);

    const emailResult = await sendEnhancedRAEmail(
      'ra-request',
      enhancedTemplateData,
      { to: emailTemplate.to!, name: emailTemplate.toName || undefined },
      contactInfo
    );
    
    console.log(`Enhanced RA email sent successfully for memo ${result.memo.memoNumber}: ${emailResult.emailId}`);
    
    // Update request status to 'sent'
    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'sent',
      p_resend_email_id: emailResult.emailId
    });
    
    // Update the request object with sent status
    result.request.status = 'sent';
    
  } catch (emailError: any) {
    console.error('Failed to send enhanced RA email:', emailError.message);
    
    // Update request status to 'failed'
    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'failed',
      p_error_message: emailError.message
    });
    
    // Update the request object with failed status
    result.request.status = 'failed';
    result.request.errorMessage = emailError.message;
    
    throw emailError;
  }
  
  return result;
};

export const receiveRA = async (
  debitMemoId: string,
  raNumber: string,
  pdfUrl?: string
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_receive', {
    p_debit_memo_id: debitMemoId,
    p_ra_number: raNumber,
    p_pdf_url: pdfUrl || null,
  });
  handleRpcError(data, error, 'Failed to record RA received');
  return data.data;
};

export const resendRARequest = async (
  debitMemoId: string,
  sentBy?: string,
  emailOverride?: string
): Promise<{ memo: any; request: RARequest }> => {
  const sb = ensureAdmin();
  
  // Create resend request record
  const { data, error } = await sb.rpc('ra_resend_request', {
    p_debit_memo_id: debitMemoId,
    p_sent_by: sentBy || null,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to create RA resend request');
  
  const result = data.data as { memo: any; request: RARequest };
  
  // Generate reminder email template
  let reminderTemplate: RAReminderTemplate;
  try {
    reminderTemplate = await generateReminderEmail(debitMemoId, emailOverride);
  } catch (templateError: any) {
    console.error('Failed to generate reminder email template:', templateError.message);
    throw new AppError(`Failed to generate reminder email template: ${templateError.message}`, 500);
  }
  
  // Send the enhanced reminder email
  try {
    const contactInfo = {
      name: process.env.CONTACT_NAME || 'Returns Department',
      email: process.env.CONTACT_EMAIL || 'returns@fcr-system.com',
      phone: process.env.CONTACT_PHONE || undefined
    };

    // Calculate days since original request
    const daysSinceRequest = reminderTemplate.originalDate 
      ? Math.floor((Date.now() - new Date(reminderTemplate.originalDate).getTime()) / (1000 * 60 * 60 * 24))
      : 14; // Default to 14 days if no original date

    const enhancedReminderData = {
      memoNumber: reminderTemplate.memoNumber,
      pharmacyName: reminderTemplate.pharmacyName,
      requestCount: reminderTemplate.requestCount,
      originalDate: reminderTemplate.originalDate,
      daysSinceRequest
    };

    const emailResult = await sendEnhancedRAEmail(
      'ra-reminder',
      enhancedReminderData,
      { to: reminderTemplate.to!, name: reminderTemplate.toName || undefined },
      contactInfo
    );
    
    console.log(`Enhanced RA reminder email sent successfully for memo ${result.memo.memoNumber}: ${emailResult.emailId}`);
    
    // Update request status to 'sent'
    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'sent',
      p_resend_email_id: emailResult.emailId
    });
    
    result.request.status = 'sent';
    
  } catch (emailError: any) {
    console.error('Failed to send enhanced RA reminder email:', emailError.message);
    
    // Update request status to 'failed'
    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'failed',
      p_error_message: emailError.message
    });
    
    result.request.status = 'failed';
    result.request.errorMessage = emailError.message;
    
    throw emailError;
  }
  
  return result;
};

// ============================================================
// RA Tracking / Dashboard
// ============================================================

export const listRATracking = async (filters: {
  raStatus?: string;
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; pagination: any; summary: RATrackingSummary }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_list_tracking', {
    p_ra_status: filters.raStatus || null,
    p_destination: filters.destination || null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
  });
  handleRpcError(data, error, 'Failed to list RA tracking');
  return {
    data: data.data,
    pagination: data.pagination,
    summary: data.summary as RATrackingSummary,
  };
};

export const listOutstandingRAs = async (
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: any[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_list_outstanding', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });
  handleRpcError(data, error, 'Failed to list outstanding RAs');
  return { data: data.data, pagination: data.pagination };
};

export const listOverdueRAs = async (
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: any[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_list_overdue', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });
  handleRpcError(data, error, 'Failed to list overdue RAs');
  return { data: data.data, pagination: data.pagination };
};

// ============================================================
// Outbound shipment
// ============================================================

export const shipDebitMemo = async (
  debitMemoId: string,
  outboundTracking: string,
  shippedAt?: string
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_ship_debit_memo', {
    p_debit_memo_id: debitMemoId,
    p_outbound_tracking: outboundTracking,
    p_shipped_at: shippedAt || new Date().toISOString(),
  });
  handleRpcError(data, error, 'Failed to record shipment');
  return data.data;
};

export const listOutboundShipments = async (
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: any[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_list_outbound_shipments', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });
  handleRpcError(data, error, 'Failed to list outbound shipments');
  return { data: data.data, pagination: data.pagination };
};

// ============================================================
// Email templates
// ============================================================

export const generateRequestEmail = async (
  debitMemoId: string,
  emailOverride?: string
): Promise<RAEmailTemplate> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_generate_request_email', {
    p_debit_memo_id: debitMemoId,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to generate request email');
  return data.data as RAEmailTemplate;
};

export const generateReminderEmail = async (
  debitMemoId: string,
  emailOverride?: string
): Promise<RAReminderTemplate> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ra_generate_reminder_email', {
    p_debit_memo_id: debitMemoId,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to generate reminder email');
  return data.data as RAReminderTemplate;
};
