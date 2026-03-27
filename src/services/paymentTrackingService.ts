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

export interface PaymentRecordResult {
  id: string;
  memoNumber: string;
  paymentStatus: string;
  amountRequested: number;
  amountReceived: number;
  paymentReceivedAt: string | null;
  paymentReference: string | null;
  paymentNotes: string | null;
}

export interface UnpaidMemo {
  id: string;
  memoNumber: string;
  labelerName: string | null;
  pharmacyName: string;
  amountRequested: number;
  amountReceived: number;
  daysOutstanding: number;
  outstandingAmount: number;
  paymentStatus: string;
}

export interface UnpaidSummary {
  totalUnpaid: number;
  totalOutstanding: number;
}

export interface AskVsReceivedRow {
  labelerId: string | null;
  labelerName: string;
  memoCount: number;
  totalAskValue: number;
  totalReceived: number;
  difference: number;
  payPercent: number;
}

export interface ManufacturerPaymentSummary {
  labelerId: string | null;
  labelerName: string;
  totalMemos: number;
  unpaidMemos: number;
  paidMemos: number;
  totalAskValue: number;
  totalPaidAmount: number;
  outstandingAmount: number;
  averagePayPercent: number;
  averageDaysToPay: number;
}

// ============================================================
// Record payment
// ============================================================

export const recordPayment = async (
  debitMemoId: string,
  amountReceived: number,
  paymentDate?: string,
  reference?: string,
  notes?: string,
  creditMemoUrl?: string
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_record', {
    p_debit_memo_id: debitMemoId,
    p_amount_received: amountReceived,
    p_payment_date: paymentDate || new Date().toISOString(),
    p_reference: reference || null,
    p_notes: notes || null,
    p_credit_memo_url: creditMemoUrl || null,
  });
  handleRpcError(data, error, 'Failed to record payment');
  return data.data;
};

// ============================================================
// List unpaid debit memos
// ============================================================

export const listUnpaid = async (filters: {
  manufacturer?: string;
  destination?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: UnpaidMemo[]; pagination: any; summary: UnpaidSummary }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_list_unpaid', {
    p_manufacturer: filters.manufacturer || null,
    p_destination: filters.destination || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
  });
  handleRpcError(data, error, 'Failed to list unpaid debit memos');
  return {
    data: data.data as UnpaidMemo[],
    pagination: data.pagination,
    summary: data.summary as UnpaidSummary,
  };
};

// ============================================================
// Send payment reminder
// ============================================================

export const sendPaymentReminder = async (
  debitMemoId: string,
  sentBy?: string,
  emailOverride?: string
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_send_reminder', {
    p_debit_memo_id: debitMemoId,
    p_sent_by: sentBy || null,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to send payment reminder');
  return data.data;
};

// ============================================================
// Ask vs Received analytics
// ============================================================

export const askVsReceived = async (
  groupBy?: string,
  period?: string
): Promise<{ data: AskVsReceivedRow[]; totals: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_ask_vs_received', {
    p_group_by: groupBy || 'manufacturer',
    p_period: period || null,
  });
  handleRpcError(data, error, 'Failed to get ask vs received analytics');
  return { data: data.data as AskVsReceivedRow[], totals: data.totals };
};

// ============================================================
// Manufacturer payment summary
// ============================================================

export const manufacturerPaymentSummary = async (
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: ManufacturerPaymentSummary[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_manufacturer_summary', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });
  handleRpcError(data, error, 'Failed to get manufacturer payment summary');
  return { data: data.data as ManufacturerPaymentSummary[], pagination: data.pagination };
};
