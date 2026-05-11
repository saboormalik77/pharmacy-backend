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

/** Payment actions (record payment, send reminder) only after outbound ship is recorded. */
async function assertDebitMemoShippedForPaymentActions(
  sb: ReturnType<typeof ensureAdmin>,
  debitMemoId: string
): Promise<void> {
  const { data: memoRow, error: memoErr } = await sb
    .from('debit_memos')
    .select('ra_status, shipped_at, outbound_tracking')
    .eq('id', debitMemoId)
    .single();

  if (memoErr || !memoRow) {
    throw new AppError('Debit memo not found', 404);
  }

  const row = memoRow as { ra_status: string; shipped_at: string | null; outbound_tracking: string | null };
  const hasTracking = row.outbound_tracking != null && String(row.outbound_tracking).trim() !== '';
  const hasShippedAt = row.shipped_at != null && String(row.shipped_at).trim() !== '';
  const shipped = row.ra_status === 'shipped' || hasShippedAt || hasTracking;

  if (!shipped) {
    throw new AppError(
      'Cannot record payment or send payment reminders until the debit memo is shipped (outbound shipment recorded in RA Tracking).',
      400
    );
  }
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
  reference?: string | null,
  notes?: string | null,
  creditMemoUrl?: string
): Promise<any> => {
  const sb = ensureAdmin();
  await assertDebitMemoShippedForPaymentActions(sb, debitMemoId);

  const { data, error } = await sb.rpc('payment_record', {
    p_debit_memo_id: debitMemoId,
    p_amount_received: amountReceived,
    p_payment_date: paymentDate || new Date().toISOString(),
    p_reference: reference !== undefined ? reference : null,
    p_notes: notes !== undefined ? notes : null,
    p_credit_memo_url: creditMemoUrl || null,
  });
  handleRpcError(data, error, 'Failed to record payment');
  return data.data;
};

// ============================================================
// Update payment
// ============================================================

export const updatePayment = async (
  debitMemoId: string,
  amountReceived: number,
  paymentDate?: string,
  reference?: string | null,
  notes?: string | null,
  creditMemoUrl?: string
): Promise<any> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('payment_record', {
    p_debit_memo_id: debitMemoId,
    p_amount_received: amountReceived,
    p_payment_date: paymentDate || new Date().toISOString(),
    p_reference: reference !== undefined ? reference : null,
    p_notes: notes !== undefined ? notes : null,
    p_credit_memo_url: creditMemoUrl || null,
  });
  handleRpcError(data, error, 'Failed to update payment');
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
  await assertDebitMemoShippedForPaymentActions(sb, debitMemoId);

  // First, call the RPC to log the reminder and get email details
  const { data, error } = await sb.rpc('payment_send_reminder', {
    p_debit_memo_id: debitMemoId,
    p_sent_by: sentBy || null,
    p_email_override: emailOverride || null,
  });
  handleRpcError(data, error, 'Failed to log payment reminder');

  const reminderData = data.data;
  const request = reminderData.request;

  // Now actually send the email via Edge Function
  try {
    const emailPayload = {
      to: request.destinationEmail,
      templateType: 'payment-reminder',
      templateData: {
        memoNumber: reminderData.memo.memoNumber,
        pharmacyName: reminderData.memo.pharmacyName || 'Unknown Pharmacy',
        destination: reminderData.memo.destination || 'Unknown',
        outstandingAmount: reminderData.memo.amountRequested - reminderData.memo.amountReceived,
        originalAmount: reminderData.memo.amountRequested,
      },
      recipientName: request.destinationName || undefined,
      replyTo: process.env.SMTP_USER || process.env.REPLY_TO_EMAIL || undefined,
    };

    console.log(`Sending payment reminder email for memo ${reminderData.memo.memoNumber} to ${request.destinationEmail}`);

    const { data: mailResult, error: mailError } = await sb.functions.invoke('send-email', {
      body: emailPayload,
    });

    if (mailError) {
      console.error('Failed to send payment reminder email:', mailError);
      throw new AppError(`Failed to send payment reminder email: ${mailError.message}`, 500);
    }

    console.log(`Payment reminder email sent: messageId=${mailResult?.messageId || 'unknown'}`);

    // Update the ra_requests record with the email ID if available
    if (mailResult?.messageId && request.id) {
      await sb
        .from('ra_requests')
        .update({ resend_email_id: mailResult.messageId })
        .eq('id', request.id);
    }

    return reminderData;
  } catch (emailError: any) {
    console.error('Failed to send payment reminder email:', emailError.message);
    throw new AppError(`Payment reminder logged but email failed: ${emailError.message}`, 500);
  }
};

// ============================================================
// Ask vs Received analytics
// ============================================================

export const askVsReceived = async (
  groupBy?: string,
  period?: string,
  page?: number,
  limit?: number
): Promise<{ data: AskVsReceivedRow[]; totals: any; pagination?: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_ask_vs_received', {
    p_group_by: groupBy || 'manufacturer',
    p_period: period || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });
  handleRpcError(data, error, 'Failed to get ask vs received analytics');
  return { data: data.data as AskVsReceivedRow[], totals: data.totals, pagination: data.pagination };
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

// ============================================================
// List unpaid memos grouped by return
// ============================================================

export interface ReturnWithUnpaidMemos {
  returnId: string;
  licensePlate: string;
  pharmacyId: string;
  pharmacyName: string;
  status: string;
  returnCreatedAt: string;
  totalMemos: number;
  totalItems: number;
  totalAskValue: number;
  totalOutstanding: number;
  memos: UnpaidMemo[];
}

export const listUnpaidGroupedByReturn = async (filters: {
  manufacturer?: string;
  destination?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: ReturnWithUnpaidMemos[]; pagination: any; summary: UnpaidSummary }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_list_unpaid_grouped_by_return', {
    p_manufacturer: filters.manufacturer || null,
    p_destination: filters.destination || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 10,
  });
  handleRpcError(data, error, 'Failed to list unpaid debit memos grouped by return');
  return {
    data: data.data as ReturnWithUnpaidMemos[],
    pagination: data.pagination,
    summary: data.summary as UnpaidSummary,
  };
};

// ============================================================
// List paid memos grouped by return
// ============================================================

export interface ReturnWithPaidMemos {
  returnId: string;
  licensePlate: string;
  pharmacyId: string;
  pharmacyName: string;
  status: string;
  returnCreatedAt: string;
  totalMemos: number;
  totalItems: number;
  totalAskValue: number;
  totalReceived: number;
  memos: any[];
}

export const listPaidGroupedByReturn = async (filters: {
  destination?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: ReturnWithPaidMemos[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('payment_list_paid_grouped_by_return', {
    p_destination: filters.destination || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 10,
  });
  handleRpcError(data, error, 'Failed to list paid debit memos grouped by return');
  return {
    data: data.data as ReturnWithPaidMemos[],
    pagination: data.pagination,
  };
};
