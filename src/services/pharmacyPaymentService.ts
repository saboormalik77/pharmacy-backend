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

export interface PharmacyPayment {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  batchId: string | null;
  batchName: string | null;
  batchMonth: string | null;
  totalCreditReceived: number;
  companyFee: number;
  companyFeePercent: number;
  gpoShare: number;
  gpoName: string | null;
  pharmacyPayout: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutCalculation {
  pharmacyId: string;
  pharmacyName: string;
  batchId: string;
  batchName: string;
  gpoName: string | null;
  totalCreditReceived: number;
  memoCount: number;
  companyFeePercent: number;
  companyFee: number;
  gpoSharePercent: number;
  gpoShare: number;
  pharmacyPayout: number;
}

export interface PharmacyPaymentSummary {
  pharmacyId: string;
  pharmacyName: string;
  storeNumber: string | null;
  gpoAffiliation: string | null;
  totalPayments: number;
  totalCreditReceived: number;
  totalCompanyFee: number;
  totalGpoShare: number;
  totalPayout: number;
  paidCount: number;
  pendingCount: number;
  lastPaidAt: string | null;
}

// ============================================================
// Calculate payout
// ============================================================

export const calculatePayout = async (
  pharmacyId: string,
  batchId: string,
  companyFeePct?: number,
  gpoSharePct?: number
): Promise<PayoutCalculation> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('pharmacy_payment_calculate', {
    p_pharmacy_id: pharmacyId,
    p_batch_id: batchId,
    p_company_fee_pct: companyFeePct ?? 27.0,
    p_gpo_share_pct: gpoSharePct ?? 0.0,
  });
  handleRpcError(data, error, 'Failed to calculate payout');
  return data.data as PayoutCalculation;
};

// ============================================================
// Create payment record
// ============================================================

export const createPaymentRecord = async (params: {
  pharmacyId: string;
  batchId?: string;
  totalCreditReceived?: number;
  companyFeePercent?: number;
  companyFee?: number;
  gpoShare?: number;
  pharmacyPayout?: number;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  createdBy?: string;
}): Promise<PharmacyPayment> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('pharmacy_payment_create', {
    p_pharmacy_id: params.pharmacyId,
    p_batch_id: params.batchId || null,
    p_total_credit_received: params.totalCreditReceived ?? 0,
    p_company_fee_percent: params.companyFeePercent ?? 27.0,
    p_company_fee: params.companyFee ?? 0,
    p_gpo_share: params.gpoShare ?? 0,
    p_pharmacy_payout: params.pharmacyPayout ?? 0,
    p_payment_method: params.paymentMethod || null,
    p_payment_reference: params.paymentReference || null,
    p_notes: params.notes || null,
    p_created_by: params.createdBy || null,
  });
  handleRpcError(data, error, 'Failed to create payment record');
  return data.data as PharmacyPayment;
};

// ============================================================
// Update payment record
// ============================================================

export const updatePaymentRecord = async (
  paymentId: string,
  params: {
    status?: string;
    paymentMethod?: string;
    paymentReference?: string;
    paidAt?: string;
    notes?: string;
    companyFee?: number;
    companyFeePercent?: number;
    gpoShare?: number;
    pharmacyPayout?: number;
    totalCreditReceived?: number;
  }
): Promise<PharmacyPayment> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('pharmacy_payment_update', {
    p_payment_id: paymentId,
    p_status: params.status || null,
    p_payment_method: params.paymentMethod || null,
    p_payment_reference: params.paymentReference || null,
    p_paid_at: params.paidAt || null,
    p_notes: params.notes || null,
    p_company_fee: params.companyFee ?? null,
    p_company_fee_pct: params.companyFeePercent ?? null,
    p_gpo_share: params.gpoShare ?? null,
    p_pharmacy_payout: params.pharmacyPayout ?? null,
    p_total_credit: params.totalCreditReceived ?? null,
  });
  handleRpcError(data, error, 'Failed to update payment record');
  return data.data as PharmacyPayment;
};

// ============================================================
// Get payment by ID
// ============================================================

export const getPayment = async (paymentId: string): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('pharmacy_payment_get', {
    p_payment_id: paymentId,
  });
  handleRpcError(data, error, 'Failed to get payment');
  return data.data;
};

// ============================================================
// List payments (admin)
// ============================================================

export const listPayments = async (filters: {
  status?: string;
  pharmacy?: string;
  batchId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: PharmacyPayment[]; pagination: any; summary: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('pharmacy_payment_list', {
    p_status: filters.status || null,
    p_pharmacy: filters.pharmacy || null,
    p_batch_id: filters.batchId || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
  });
  handleRpcError(data, error, 'Failed to list payments');
  return {
    data: data.data as PharmacyPayment[],
    pagination: data.pagination,
    summary: data.summary,
  };
};

// ============================================================
// Payment summary by pharmacy (admin)
// ============================================================

export const paymentSummary = async (
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: PharmacyPaymentSummary[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('pharmacy_payment_summary', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });
  handleRpcError(data, error, 'Failed to get payment summary');
  return {
    data: data.data as PharmacyPaymentSummary[],
    pagination: data.pagination,
  };
};

// ============================================================
// My payments (pharmacy-facing)
// ============================================================

export const myPayments = async (
  pharmacyId: string,
  filters: {
    status?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ data: PharmacyPayment[]; pagination: any; summary: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('pharmacy_payment_my_payments', {
    p_pharmacy_id: pharmacyId,
    p_status: filters.status || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
  });
  handleRpcError(data, error, 'Failed to get pharmacy payments');
  return {
    data: data.data as PharmacyPayment[],
    pagination: data.pagination,
    summary: data.summary,
  };
};
