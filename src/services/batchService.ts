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

export interface ReturnBatch {
  id: string;
  batchMonth: string;
  batchName: string;
  status: string;
  totalReturns: number;
  totalDebitMemos: number;
  totalValue: number;
  cardinalFileGenerated: boolean;
  cardinalFileUrl: string | null;
  cardinalSubmittedAt: string | null;
  cardinalApprovedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebitMemo {
  id: string;
  batchId: string;
  pharmacyId: string;
  pharmacyName: string;
  memoNumber: string;
  destination: string | null;
  labelerId: string | null;
  labelerName: string | null;
  totalItems: number;
  totalAskValue: number;
  totalReceivedValue: number;
  raNumber: string | null;
  raRequestedAt: string | null;
  raReceivedAt: string | null;
  ticklerDate: string | null;
  baggieManifest: string | null;
  outboundTracking: string | null;
  shippedAt: string | null;
  paymentStatus: string;
  amountRequested: number;
  amountReceived: number;
  createdAt: string;
  updatedAt: string;
}

export interface DebitMemoItem {
  id: string;
  debitMemoId: string;
  transactionItemId: string | null;
  ndc: string | null;
  productName: string | null;
  quantity: number;
  askPrice: number | null;
  receivedPrice: number | null;
  lotNumber: string | null;
  expirationDate: string | null;
  createdAt: string;
}

// ============================================================
// Batch operations
// ============================================================

export const createBatch = async (
  batchMonth: string,
  batchName?: string
): Promise<ReturnBatch> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('create_batch', {
    p_batch_month: batchMonth,
    p_batch_name: batchName || null,
  });
  handleRpcError(data, error, 'Failed to create batch');
  return data.data as ReturnBatch;
};

export const listBatches = async (
  status?: string,
  page?: number,
  limit?: number
): Promise<{ data: ReturnBatch[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('list_batches', {
    p_status: status || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });
  handleRpcError(data, error, 'Failed to list batches');
  return { data: data.data as ReturnBatch[], pagination: data.pagination };
};

export const getBatch = async (
  batchId: string
): Promise<{ batch: ReturnBatch; debitMemos: DebitMemo[]; returns: any[] }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_batch', { p_id: batchId });
  handleRpcError(data, error, 'Failed to get batch');
  return data.data as { batch: ReturnBatch; debitMemos: DebitMemo[]; returns: any[] };
};

export const assignReturnsToBatch = async (
  batchId: string,
  transactionIds: string[]
): Promise<{ batch: ReturnBatch; assigned: number }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('assign_returns_to_batch', {
    p_batch_id: batchId,
    p_transaction_ids: transactionIds,
  });
  handleRpcError(data, error, 'Failed to assign returns to batch');
  return { batch: data.data as ReturnBatch, assigned: data.assigned };
};

export const closeBatch = async (
  batchId: string
): Promise<{ batch: ReturnBatch; memosGenerated: number }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('close_batch', { p_batch_id: batchId });
  handleRpcError(data, error, 'Failed to close batch');
  return { batch: data.data as ReturnBatch, memosGenerated: data.memosGenerated };
};

export const submitCardinal = async (
  batchId: string
): Promise<ReturnBatch> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('submit_cardinal', { p_batch_id: batchId });
  handleRpcError(data, error, 'Failed to submit to Cardinal');
  return data.data as ReturnBatch;
};

// ============================================================
// Debit memo operations
// ============================================================

export const listDebitMemos = async (filters: {
  batchId?: string;
  pharmacyId?: string;
  destination?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: DebitMemo[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('list_debit_memos', {
    p_batch_id: filters.batchId || null,
    p_pharmacy_id: filters.pharmacyId || null,
    p_destination: filters.destination || null,
    p_payment_status: filters.paymentStatus || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
  });
  handleRpcError(data, error, 'Failed to list debit memos');
  return { data: data.data as DebitMemo[], pagination: data.pagination };
};

export const getDebitMemo = async (
  memoId: string
): Promise<{ memo: DebitMemo; items: DebitMemoItem[] }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_debit_memo', { p_id: memoId });
  handleRpcError(data, error, 'Failed to get debit memo');
  return data.data as { memo: DebitMemo; items: DebitMemoItem[] };
};

export const updateDebitMemo = async (
  memoId: string,
  updates: {
    raNumber?: string;
    raRequestedAt?: string;
    raReceivedAt?: string;
    ticklerDate?: string;
    baggieManifest?: string;
    outboundTracking?: string;
    shippedAt?: string;
    paymentStatus?: string;
    amountRequested?: number;
    amountReceived?: number;
  }
): Promise<DebitMemo> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('update_debit_memo', {
    p_id: memoId,
    p_ra_number: updates.raNumber || null,
    p_ra_requested_at: updates.raRequestedAt || null,
    p_ra_received_at: updates.raReceivedAt || null,
    p_tickler_date: updates.ticklerDate || null,
    p_baggie_manifest: updates.baggieManifest || null,
    p_outbound_tracking: updates.outboundTracking || null,
    p_shipped_at: updates.shippedAt || null,
    p_payment_status: updates.paymentStatus || null,
    p_amount_requested: updates.amountRequested ?? null,
    p_amount_received: updates.amountReceived ?? null,
  });
  handleRpcError(data, error, 'Failed to update debit memo');
  return data.data as DebitMemo;
};
