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
  raStatus: string | null;
  ticklerDate: string | null;
  baggieManifest: string | null;
  outboundTracking: string | null;
  shippedAt: string | null;
  paymentStatus: string;
  amountRequested: number;
  amountReceived: number;
  paymentReceivedAt: string | null;
  paymentReference: string | null;
  paymentNotes: string | null;
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

/** Distinct YYYY-MM values for which a batch already exists (one batch per calendar month). */
export const listUsedBatchMonths = async (): Promise<string[]> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.from('return_batches').select('batch_month');
  if (error) throw new AppError(`Failed to list batch months: ${error.message}`, 400);
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const raw = (row as { batch_month: string }).batch_month;
    if (raw == null) continue;
    const s = typeof raw === 'string' ? raw : String(raw);
    const ym = s.length >= 7 ? s.slice(0, 7) : s;
    if (/^\d{4}-\d{2}$/.test(ym)) seen.add(ym);
  }
  return Array.from(seen).sort();
};

export const listBatches = async (
  status?: string,
  page?: number,
  limit?: number,
  options?: {
    allDebitMemosShipped?: boolean;
    excludeIfNoRemainingPharmacyPayout?: boolean;
    allDebitMemosPaidOrPartial?: boolean;
  }
): Promise<{ data: ReturnBatch[]; pagination: any }> => {
  const sb = ensureAdmin();
  const o = options ?? {};
  const { data, error } = await sb.rpc('list_batches', {
    p_status: status || null,
    p_page: page || 1,
    p_limit: limit || 20,
    p_all_debit_memos_shipped: Boolean(o.allDebitMemosShipped),
    p_exclude_if_no_remaining_pharmacy_payout: Boolean(o.excludeIfNoRemainingPharmacyPayout),
    p_all_debit_memos_paid_or_partial: Boolean(o.allDebitMemosPaidOrPartial),
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
  return { batch: data.data as ReturnBatch, memosGenerated: data.memosGenerated ?? 0 };
};

export const generateBatchMemos = async (
  batchId: string
): Promise<{ batch: ReturnBatch; memosGenerated: number }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('generate_debit_memos_for_batch', {
    p_batch_id: batchId,
  });
  handleRpcError(data, error, 'Failed to generate debit memos');
  return { batch: data.data as ReturnBatch, memosGenerated: data.memosGenerated as number };
};

export const submitCardinal = async (
  batchId: string
): Promise<ReturnBatch> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('submit_cardinal', { p_batch_id: batchId });
  handleRpcError(data, error, 'Failed to submit to Cardinal');
  return data.data as ReturnBatch;
};

export const fixBatchDestinations = async (
  batchId: string
): Promise<{ updated_count: number; message: string }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('fix_batch_destinations', { p_batch_id: batchId });
  handleRpcError(data, error, 'Failed to fix batch destinations');
  return data;
};

// ============================================================
// New batch management operations
// ============================================================

export const deleteBatch = async (
  batchId: string
): Promise<{ message: string; deletedBatch: ReturnBatch; unassignedReturns: number }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('delete_batch', { p_batch_id: batchId });
  handleRpcError(data, error, 'Failed to delete batch');
  return {
    message: data.message,
    deletedBatch: data.deleted_batch as ReturnBatch,
    unassignedReturns: data.unassigned_returns
  };
};

export const unassignReturnsFromBatch = async (
  batchId: string,
  transactionIds: string[]
): Promise<{ message: string; batch: ReturnBatch; unassignedCount: number; skippedCount: number }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('unassign_returns_from_batch', {
    p_batch_id: batchId,
    p_transaction_ids: transactionIds,
  });
  handleRpcError(data, error, 'Failed to unassign returns from batch');
  return {
    message: data.message,
    batch: data.batch as ReturnBatch,
    unassignedCount: data.unassigned_count,
    skippedCount: data.skipped_count
  };
};

export const unassignSingleReturn = async (
  transactionId: string
): Promise<{ message: string; batch: ReturnBatch; return: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('unassign_single_return', { p_transaction_id: transactionId });
  handleRpcError(data, error, 'Failed to unassign return');
  return {
    message: data.message,
    batch: data.batch as ReturnBatch,
    return: data.return
  };
};

export interface BatchPermissions {
  batchId: string;
  status: string;
  canDelete: boolean;
  canUnassignReturns: boolean;
  canAssignReturns: boolean;
  canClose: boolean;
  canSubmitCardinal: boolean;
  hasDebitMemos: boolean;
  debitMemoCount: number;
}

export const getBatchPermissions = async (
  batchId: string
): Promise<BatchPermissions> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_batch_permissions', { p_batch_id: batchId });
  handleRpcError(data, error, 'Failed to get batch permissions');
  return data.data as BatchPermissions;
};


// ============================================================
// Batch workflow operations (FCR-36)
// ============================================================

export type WorkflowStepKey =
  | 'cardinal_generated'
  | 'cardinal_sent'
  | 'debit_memos_created'
  | 'ra_requested';

export interface BatchWorkflowState {
  cardinalGenerated: boolean;
  cardinalSent: boolean;
  debitMemosCreated: boolean;
  raRequested: boolean;
}

const VALID_WORKFLOW_STEPS: WorkflowStepKey[] = [
  'cardinal_generated',
  'cardinal_sent',
  'debit_memos_created',
  'ra_requested',
];

export const getBatchWorkflow = async (
  batchId: string
): Promise<BatchWorkflowState> => {
  const sb = ensureAdmin();
  const { data, error } = await sb
    .from('batch_workflow_steps')
    .select('step_key')
    .eq('batch_id', batchId);

  if (error) throw new AppError(`Failed to get workflow: ${error.message}`, 400);

  const done = new Set((data || []).map((r: { step_key: string }) => r.step_key));
  return {
    cardinalGenerated: done.has('cardinal_generated'),
    cardinalSent: done.has('cardinal_sent'),
    debitMemosCreated: done.has('debit_memos_created'),
    raRequested: done.has('ra_requested'),
  };
};

export const completeBatchWorkflowStep = async (
  batchId: string,
  stepKey: string,
  metadata?: Record<string, unknown>
): Promise<BatchWorkflowState> => {
  if (!VALID_WORKFLOW_STEPS.includes(stepKey as WorkflowStepKey)) {
    throw new AppError(`Invalid step key: ${stepKey}`, 400);
  }

  const sb = ensureAdmin();
  const { error } = await sb
    .from('batch_workflow_steps')
    .upsert(
      { batch_id: batchId, step_key: stepKey, metadata: metadata || {} },
      { onConflict: 'batch_id,step_key' }
    );

  if (error) throw new AppError(`Failed to complete step: ${error.message}`, 400);

  return getBatchWorkflow(batchId);
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
