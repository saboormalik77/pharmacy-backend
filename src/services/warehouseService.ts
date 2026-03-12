import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { ReturnTransaction } from './returnTransactionService';

function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
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

export interface WarehouseDiscrepancy {
  id: string;
  transactionId: string;
  itemId: string | null;
  type: string;
  ndc: string | null;
  productName: string | null;
  expectedQuantity: number | null;
  actualQuantity: number | null;
  notes: string | null;
  status: string;
  reportedBy: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface VerifiedItem {
  id: string;
  transactionId: string;
  ndc: string | null;
  proprietaryName: string | null;
  genericName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  actualQuantity: number | null;
  verified: boolean;
  conditionNotes: string | null;
  returnStatus: string;
  destination: string | null;
  estimatedValue: number | null;
}

// ============================================================
// Task 9.1: Receive a return by FedEx tracking
// ============================================================

export const receiveReturn = async (
  fedexTracking: string
): Promise<ReturnTransaction> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_receive_return', {
    p_fedex_tracking: fedexTracking,
  });

  handleRpcError(data, error, 'Failed to receive return');
  return data.data as ReturnTransaction;
};

// ============================================================
// Task 9.2: List pending returns (finalized, not yet received)
// ============================================================

export const listPending = async (
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: ReturnTransaction[]; pagination: any }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_list_pending', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });

  handleRpcError(data, error, 'Failed to list pending returns');
  return { data: data.data as ReturnTransaction[], pagination: data.pagination };
};

// ============================================================
// Task 9.2: List received returns (awaiting verification)
// ============================================================

export const listReceived = async (
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: ReturnTransaction[]; pagination: any }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_list_received', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });

  handleRpcError(data, error, 'Failed to list received returns');
  return { data: data.data as ReturnTransaction[], pagination: data.pagination };
};

// ============================================================
// Task 9.2: Verify an entire return
// ============================================================

export const verifyReturn = async (
  transactionId: string,
  piecesReceived?: number,
  verifiedIntegrity?: boolean,
  notes?: string,
  verifiedBy?: string
): Promise<{ transaction: ReturnTransaction; verification: any }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_verify_return', {
    p_id: transactionId,
    p_pieces_received: piecesReceived ?? null,
    p_verified_integrity: verifiedIntegrity ?? true,
    p_notes: notes || null,
    p_verified_by: verifiedBy || null,
  });

  handleRpcError(data, error, 'Failed to verify return');
  return {
    transaction: data.data as ReturnTransaction,
    verification: data.verification,
  };
};

// ============================================================
// Task 9.2: Verify a single item
// ============================================================

export const verifyItem = async (
  transactionId: string,
  itemId: string,
  verified?: boolean,
  actualQuantity?: number,
  conditionNotes?: string
): Promise<VerifiedItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_verify_item', {
    p_transaction_id: transactionId,
    p_item_id: itemId,
    p_verified: verified ?? true,
    p_actual_quantity: actualQuantity ?? null,
    p_condition_notes: conditionNotes || null,
  });

  handleRpcError(data, error, 'Failed to verify item');
  return data.data as VerifiedItem;
};

// ============================================================
// Task 9.3: Report a discrepancy
// ============================================================

export const reportDiscrepancy = async (input: {
  transactionId: string;
  type: string;
  itemId?: string;
  ndc?: string;
  productName?: string;
  expectedQuantity?: number;
  actualQuantity?: number;
  notes?: string;
  reportedBy?: string;
}): Promise<WarehouseDiscrepancy> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_report_discrepancy', {
    p_transaction_id: input.transactionId,
    p_type: input.type,
    p_item_id: input.itemId || null,
    p_ndc: input.ndc || null,
    p_product_name: input.productName || null,
    p_expected_quantity: input.expectedQuantity ?? null,
    p_actual_quantity: input.actualQuantity ?? null,
    p_notes: input.notes || null,
    p_reported_by: input.reportedBy || null,
  });

  handleRpcError(data, error, 'Failed to report discrepancy');
  return data.data as WarehouseDiscrepancy;
};

// ============================================================
// Task 9.3: List discrepancies for a return
// ============================================================

export const listDiscrepancies = async (
  transactionId: string,
  status?: string
): Promise<{ data: WarehouseDiscrepancy[]; total: number }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_list_discrepancies', {
    p_transaction_id: transactionId,
    p_status: status || null,
  });

  handleRpcError(data, error, 'Failed to list discrepancies');
  return { data: data.data as WarehouseDiscrepancy[], total: data.total };
};
