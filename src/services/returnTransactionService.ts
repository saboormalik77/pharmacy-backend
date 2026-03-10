import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

export interface ReturnTransaction {
  id: string;
  licensePlate: string;
  pharmacyId: string;
  pharmacyName: string | null;
  processorId: string | null;
  processorName: string | null;
  serviceType: string;
  status: string;
  fedexTracking: string | null;
  fedexPickupConfirmation: string | null;
  totalItems: number;
  totalReturnableValue: number;
  totalNonReturnableValue: number;
  batchId: string | null;
  timeIn: string | null;
  timeOut: string | null;
  receivedInWarehouseDate: string | null;
  verifiedIntegrity: boolean;
  notes: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnTransactionListResponse {
  transactions: ReturnTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReturnTransactionData {
  pharmacyId: string;
  processorId?: string;
  serviceType?: string;
  notes?: string;
  forceCreate?: boolean;
}

export interface UpdateReturnTransactionData {
  fedexTracking?: string;
  fedexPickupConfirmation?: string;
  notes?: string;
  serviceType?: string;
}

export interface ListFilters {
  pharmacyId?: string;
  processorId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// Helper — call RPC and handle the standard error envelope
// ============================================================

function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
}

function handleRpcError(data: any, rpcError: any, label: string) {
  if (rpcError) {
    throw new AppError(`${label}: ${rpcError.message}`, 400);
  }
  if (!data) {
    throw new AppError(`${label}: no data returned`, 500);
  }
  if (data.error) {
    throw new AppError(data.message || label, data.code || 400);
  }
}

// ============================================================
// RPC wrappers — zero JS query-building
// ============================================================

export const createReturnTransaction = async (
  input: CreateReturnTransactionData
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('create_return_transaction', {
    p_pharmacy_id:  input.pharmacyId,
    p_processor_id: input.processorId || null,
    p_service_type: input.serviceType || 'in_store',
    p_notes:        input.notes || null,
    p_force_create: input.forceCreate || false,
  });

  handleRpcError(data, error, 'Failed to create return transaction');
  return data.data as ReturnTransaction;
};

export const listReturnTransactions = async (
  filters: ListFilters
): Promise<ReturnTransactionListResponse> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('list_return_transactions', {
    p_pharmacy_id:  filters.pharmacyId || null,
    p_processor_id: filters.processorId || null,
    p_status:       filters.status || null,
    p_date_from:    filters.dateFrom || null,
    p_date_to:      filters.dateTo || null,
    p_search:       filters.search || null,
    p_page:         filters.page || 1,
    p_limit:        filters.limit || 20,
  });

  handleRpcError(data, error, 'Failed to list return transactions');
  return data as ReturnTransactionListResponse;
};

export const getReturnTransactionById = async (
  transactionId: string
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('get_return_transaction_by_id', {
    p_id: transactionId,
  });

  handleRpcError(data, error, 'Failed to fetch return transaction');
  return data.data as ReturnTransaction;
};

export const updateReturnTransaction = async (
  transactionId: string,
  updates: UpdateReturnTransactionData
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('update_return_transaction', {
    p_id:                        transactionId,
    p_fedex_tracking:            updates.fedexTracking || null,
    p_fedex_pickup_confirmation: updates.fedexPickupConfirmation || null,
    p_notes:                     updates.notes || null,
    p_service_type:              updates.serviceType || null,
  });

  handleRpcError(data, error, 'Failed to update return transaction');
  return data.data as ReturnTransaction;
};

export const pauseReturnTransaction = async (
  transactionId: string
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('change_return_transaction_status', {
    p_id: transactionId,
    p_new_status: 'paused',
  });

  handleRpcError(data, error, 'Failed to pause return transaction');
  return data.data as ReturnTransaction;
};

export const resumeReturnTransaction = async (
  transactionId: string
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('change_return_transaction_status', {
    p_id: transactionId,
    p_new_status: 'in_progress',
  });

  handleRpcError(data, error, 'Failed to resume return transaction');
  return data.data as ReturnTransaction;
};

export const completeReturnTransaction = async (
  transactionId: string
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('change_return_transaction_status', {
    p_id: transactionId,
    p_new_status: 'completed',
  });

  handleRpcError(data, error, 'Failed to complete return transaction');
  return data.data as ReturnTransaction;
};

export const finalizeReturnTransaction = async (
  transactionId: string
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('change_return_transaction_status', {
    p_id: transactionId,
    p_new_status: 'finalized',
  });

  handleRpcError(data, error, 'Failed to finalize return transaction');
  return data.data as ReturnTransaction;
};

export const deleteReturnTransaction = async (
  transactionId: string
): Promise<void> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('delete_return_transaction', {
    p_id: transactionId,
  });

  handleRpcError(data, error, 'Failed to delete return transaction');
};
