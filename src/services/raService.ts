import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import type { RARequestData, RAReminderData } from './nodemailerService';

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
// Edge Function Email Sending
// ============================================================

async function sendEmailViaEdgeFunction(
  templateType: 'ra-request' | 'ra-reminder',
  templateData: RARequestData | RAReminderData,
  recipient: { to: string; name?: string },
  contactInfo?: { name?: string; email?: string; phone?: string }
): Promise<{ messageId: string }> {
  const sb = ensureAdmin();

  const { data, error } = await sb.functions.invoke('send-email', {
    body: {
      to: recipient.to,
      templateType,
      templateData,
      recipientName: recipient.name,
      contactInfo
    }
  });

  if (error) {
    console.error('Edge Function error:', error);
    throw new AppError(`Failed to send email via Edge Function: ${error.message}`, 500);
  }

  if (!data?.success) {
    console.error('Edge Function returned error:', data?.error);
    throw new AppError(`Email sending failed: ${data?.error || 'Unknown error'}`, 500);
  }

  return { messageId: data.messageId };
}

// ============================================================
// RA Request operations
// ============================================================

export const sendRARequest = async (
  debitMemoId: string,
  sentBy?: string,
  emailOverride?: string
): Promise<{ memo: any; request: RARequest }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('ra_send_request', {
    p_debit_memo_id: debitMemoId,
    p_sent_by: sentBy || null,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to create RA request');

  const result = data.data as { memo: any; request: RARequest };

  let emailTemplate: RAEmailTemplate;
  try {
    emailTemplate = await generateRequestEmail(debitMemoId, emailOverride);
  } catch (templateError: any) {
    console.error('Failed to generate email template:', templateError.message);
    throw new AppError(`Failed to generate email template: ${templateError.message}`, 500);
  }

  try {
    const contactInfo = {
      name: process.env.CONTACT_NAME || 'Returns Department',
      email: process.env.CONTACT_EMAIL || 'returns@fcr-system.com',
      phone: process.env.CONTACT_PHONE || undefined,
    };

    const raData: RARequestData = {
      memoNumber: emailTemplate.memoNumber,
      pharmacyName: emailTemplate.pharmacyName,
      destination: emailTemplate.destination,
      labelerName: emailTemplate.labelerName,
      totalItems: emailTemplate.totalItems,
      totalAskValue: emailTemplate.totalAskValue,
      items: emailTemplate.items || [],
    };

    console.log(
      `Sending RA email (Edge Function) for memo ${raData.memoNumber} to ${emailTemplate.to}`
    );

    const mailResult = await sendEmailViaEdgeFunction(
      'ra-request',
      raData,
      { to: emailTemplate.to!, name: emailTemplate.toName || undefined },
      contactInfo
    );

    console.log(`RA email sent via Edge Function: messageId=${mailResult.messageId}`);

    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'sent',
      p_resend_email_id: mailResult.messageId,
    });

    result.request.status = 'sent';
  } catch (emailError: any) {
    console.error('Failed to send RA email:', emailError.message);

    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'failed',
      p_error_message: emailError.message,
    });

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

  const { data, error } = await sb.rpc('ra_resend_request', {
    p_debit_memo_id: debitMemoId,
    p_sent_by: sentBy || null,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to create RA resend request');

  const result = data.data as { memo: any; request: RARequest };

  let reminderTemplate: RAReminderTemplate;
  try {
    reminderTemplate = await generateReminderEmail(debitMemoId, emailOverride);
  } catch (templateError: any) {
    console.error('Failed to generate reminder email template:', templateError.message);
    throw new AppError(
      `Failed to generate reminder email template: ${templateError.message}`,
      500
    );
  }

  try {
    const contactInfo = {
      name: process.env.CONTACT_NAME || 'Returns Department',
      email: process.env.CONTACT_EMAIL || 'returns@fcr-system.com',
      phone: process.env.CONTACT_PHONE || undefined,
    };

    const daysSinceRequest = reminderTemplate.originalDate
      ? Math.floor(
          (Date.now() - new Date(reminderTemplate.originalDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 14;

    // Get complete memo data for enhanced reminder
    let requestEmailTemplate: RAEmailTemplate;
    try {
      requestEmailTemplate = await generateRequestEmail(debitMemoId, emailOverride);
    } catch (error) {
      console.warn('Could not fetch complete memo data for reminder, using basic data:', error);
      requestEmailTemplate = {
        to: reminderTemplate.to,
        toName: reminderTemplate.toName,
        subject: '',
        body: '',
        memoNumber: reminderTemplate.memoNumber,
        pharmacyName: reminderTemplate.pharmacyName,
        destination: null,
        labelerName: null,
        totalItems: 0,
        totalAskValue: 0,
        items: []
      };
    }

    const reminderData: RAReminderData = {
      memoNumber: reminderTemplate.memoNumber,
      pharmacyName: reminderTemplate.pharmacyName,
      requestCount: reminderTemplate.requestCount,
      daysSinceRequest,
      originalDate: reminderTemplate.originalDate,
      // Enhanced data from original request
      destination: requestEmailTemplate.destination,
      labelerName: requestEmailTemplate.labelerName,
      totalItems: requestEmailTemplate.totalItems,
      totalAskValue: requestEmailTemplate.totalAskValue,
      items: requestEmailTemplate.items || [],
    };

    console.log(
      `Sending RA reminder (Edge Function) for memo ${reminderData.memoNumber} to ${reminderTemplate.to}`
    );

    const mailResult = await sendEmailViaEdgeFunction(
      'ra-reminder',
      reminderData,
      { to: reminderTemplate.to!, name: reminderTemplate.toName || undefined },
      contactInfo
    );

    console.log(`RA reminder sent via Edge Function: messageId=${mailResult.messageId}`);

    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'sent',
      p_resend_email_id: mailResult.messageId,
    });

    result.request.status = 'sent';
  } catch (emailError: any) {
    console.error('Failed to send RA reminder email:', emailError.message);

    await sb.rpc('ra_update_request_status', {
      p_request_id: result.request.id,
      p_status: 'failed',
      p_error_message: emailError.message,
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
// Email templates (RPC-generated)
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
