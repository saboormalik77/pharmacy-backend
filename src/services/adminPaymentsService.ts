import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

export interface PaymentListItem {
  id: string;
  paymentId: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyEmail: string | null;
  amount: number;
  date: string;
  uploadedAt: string;
  reportDate: string | null;
  method: string;
  source: string;
  transactionId: string;
  distributorId: string | null;
  distributorName: string;
  distributorCode: string | null;
  fileName: string;
  fileType: string | null;
  fileUrl: string | null;
  extractedItems: number;
  processedAt: string | null;
}

export interface PaymentDetails extends PaymentListItem {
  pharmacyPhone: string | null;
  pharmacyNpi: string | null;
  pharmacyDea: string | null;
  distributorEmail: string | null;
  distributorPhone: string | null;
  distributorAddress: Record<string, any> | null;
  fileSize: number;
  processingProgress: number | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaymentsStats {
  totalPayments: number;
  totalAmount: number;
}

export interface PaymentsListResponse {
  payments: PaymentListItem[];
  pagination: PaginationInfo;
  stats: PaymentsStats;
}

export interface PaymentDetailsResponse {
  payment: PaymentDetails;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get list of payments with search, filter, pagination AND stats
 * Uses PostgreSQL RPC function - no custom JS logic
 * Stats are included in the response
 */
export const getPaymentsList = async (
  search?: string,
  pharmacyId?: string,
  page: number = 1,
  limit: number = 10,
  startDate?: string,
  endDate?: string
): Promise<PaymentsListResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_payments_list', {
    p_search: search || null,
    p_pharmacy_id: pharmacyId || null,
    p_page: page,
    p_limit: limit,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  if (error) {
    throw new AppError(`Failed to fetch payments: ${error.message}`, 400);
  }

  if (!data || !data.success) {
    throw new AppError(data?.error || 'Failed to fetch payments', 400);
  }

  return {
    payments: data.data.payments || [],
    pagination: data.data.pagination,
    stats: data.data.stats,
  };
};

/**
 * Get single payment details by ID
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getPaymentById = async (
  paymentId: string
): Promise<PaymentDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_payment_by_id', {
    p_payment_id: paymentId,
  });

  if (error) {
    throw new AppError(`Failed to fetch payment: ${error.message}`, 400);
  }

  if (!data || !data.success) {
    throw new AppError(data?.error || 'Payment not found', 404);
  }

  return {
    payment: data.data,
  };
};
