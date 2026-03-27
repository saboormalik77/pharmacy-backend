import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

/** Parsed from pharmacy.physical_address (same rules as processor my-stores). */
function parsePhysicalAddress(physicalAddress: unknown): {
  street: string | null;
  city: string | null;
  state: string | null;
} {
  if (physicalAddress == null) {
    return { street: null, city: null, state: null };
  }
  try {
    const addressObj =
      typeof physicalAddress === 'string' ? JSON.parse(physicalAddress) : physicalAddress;
    const o = addressObj as Record<string, unknown>;
    return {
      street: (o?.street as string) || null,
      city: (o?.city as string) || null,
      state: (o?.state as string) || null,
    };
  } catch {
    return {
      street: typeof physicalAddress === 'string' ? physicalAddress : null,
      city: null,
      state: null,
    };
  }
}

async function attachPharmacyStoreDetails(
  sb: ReturnType<typeof ensureAdmin>,
  tx: ReturnTransaction
): Promise<ReturnTransaction> {
  if (!tx.pharmacyId) return tx;

  const { data: pharm, error } = await sb
    .from('pharmacy')
    .select('store_number, physical_address, last_visit_date')
    .eq('id', tx.pharmacyId)
    .maybeSingle();

  if (error || !pharm) return tx;

  const { street, city, state } = parsePhysicalAddress(pharm.physical_address);
  const sn = pharm.store_number;
  return {
    ...tx,
    storeNumber: sn != null && sn !== '' ? String(sn) : null,
    pharmacyStreetAddress: street,
    pharmacyCity: city,
    pharmacyState: state,
    pharmacyLastVisitDate: pharm.last_visit_date ?? null,
  };
}

export interface ReturnTransaction {
  id: string;
  licensePlate: string;
  pharmacyId: string;
  pharmacyName: string | null;
  /** Enriched from pharmacy (processor my-stores parity); omitted when unavailable */
  storeNumber?: string | null;
  pharmacyStreetAddress?: string | null;
  pharmacyCity?: string | null;
  pharmacyState?: string | null;
  pharmacyLastVisitDate?: string | null;
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
  boxCount: number | null;
  manifestGeneratedAt: string | null;
  prpNumber: string | null;
  packageTracking: Record<string, string> | null;
  fedexShipmentId: string | null;
  fedexLabels: Record<string, string> | null;
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
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
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
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
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
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
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
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
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
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
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
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
};

export const finalizeReturnTransaction = async (
  transactionId: string,
  fedexTracking?: string,
  boxCount?: number,
  prpNumber?: string,
  packageTracking?: Record<string, string>
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('finalize_return_transaction', {
    p_id: transactionId,
    p_fedex_tracking: fedexTracking || null,
    p_box_count: boxCount ?? null,
    p_prp_number: prpNumber || null,
    p_package_tracking: packageTracking || null,
  });

  handleRpcError(data, error, 'Failed to finalize return transaction');
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
};

export const updateFinalizeSteps = async (
  transactionId: string,
  steps: Record<string, boolean>
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('update_finalize_steps', {
    p_id: transactionId,
    p_steps: steps,
  });

  handleRpcError(data, error, 'Failed to update finalize steps');
  return attachPharmacyStoreDetails(sb, data.data as ReturnTransaction);
};

export const getManifestData = async (
  transactionId: string
): Promise<any> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('get_manifest_data', {
    p_transaction_id: transactionId,
  });

  handleRpcError(data, error, 'Failed to get manifest data');
  return data.data;
};

export const getDeaForm222Data = async (
  transactionId: string
): Promise<any> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('get_dea_form_222_data', {
    p_transaction_id: transactionId,
  });

  handleRpcError(data, error, 'Failed to get DEA Form 222 data');
  return data.data;
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

export const checkReturnLockStatus = async (transactionId: string): Promise<{
  id: string;
  status: string;
  isLocked: boolean;
  canEdit: boolean;
  lockReason: string | null;
}> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('check_return_transaction_lock_status', {
    p_id: transactionId,
  });

  handleRpcError(data, error, 'Failed to check lock status');
  return data.data;
};
