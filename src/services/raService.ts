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
  handleRpcError(data, error, 'Failed to send RA request');
  return data.data as { memo: any; request: RARequest };
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
  handleRpcError(data, error, 'Failed to resend RA request');
  return data.data as { memo: any; request: RARequest };
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
