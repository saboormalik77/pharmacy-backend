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

export const getDebitMemoPdfData = async (memoId: string): Promise<any> => {
  const sb = ensureAdmin();

  // Get debit memo with items
  const memoResult = await getDebitMemo(memoId);
  const { memo, items } = memoResult;

  // Get pharmacy details including primary wholesaler (physical_address is a JSONB column)
  const { data: pharmacyData, error: pharmacyError } = await sb
    .from('pharmacy')
    .select('id, name, physical_address, phone, fax_number, dea_number, dea_expiration_date, primary_wholesaler, wholesaler_account_number')
    .eq('id', memo.pharmacyId)
    .single();

  if (pharmacyError) throw new AppError(`Failed to get pharmacy: ${pharmacyError.message}`, 400);

  // Get warehouse address from warehouses table (for top header)
  const { data: warehouseData, error: warehouseError } = await sb
    .from('warehouses')
    .select('name, contact_name, phone, street, city, state, zip')
    .eq('is_default', true)
    .single();

  if (warehouseError) {
    console.warn('Failed to get warehouse address:', warehouseError.message);
  }

  // Get primary wholesaler/processor details (from processors table)
  let wholesalerInfo: any = null;
  if (pharmacyData.primary_wholesaler) {
    const { data: processorData, error: processorError } = await sb
      .from('processors')
      .select('id, name, address, city, state, zip_code, phone, fax')
      .eq('name', pharmacyData.primary_wholesaler)
      .single();

    if (!processorError && processorData) {
      wholesalerInfo = processorData;
    }
  }

  // Get labeler details from manufacturer_policies table
  const { data: labelerData, error: labelerError } = await sb
    .from('manufacturer_policies')
    .select('labeler_id, manufacturer_name, address_1, city, state, zip, main_phone, fax')
    .eq('labeler_id', memo.labelerId)
    .single();

  // If labeler not found in manufacturer_policies, use labeler info from memo
  const labelerInfo = labelerData || {
    labeler_id: memo.labelerId,
    manufacturer_name: memo.labelerName,
    address_1: null,
    city: null,
    state: null,
    zip: null,
    main_phone: null,
    fax: null,
  };

  // Get return transaction items for full/partial quantities and package size
  const itemIds = items.map(item => item.transactionItemId).filter(Boolean);
  let transactionItems: any[] = [];
  
  if (itemIds.length > 0) {
    const { data: transactionItemsData, error: transactionItemsError } = await sb
      .from('return_transaction_items')
      .select('id, ndc, full_package_size, proprietary_name, generic_name')
      .in('id', itemIds);

    if (transactionItemsError) {
      console.warn('Failed to get transaction items:', transactionItemsError.message);
    } else {
      transactionItems = transactionItemsData || [];
    }
  }

  // Create a map of transaction items for easy lookup
  const transactionItemsMap = new Map();
  transactionItems.forEach((item: any) => {
    transactionItemsMap.set(item.id, item);
  });

  // Prepare PDF data
  const physicalAddress = pharmacyData.physical_address || {};
  
  const pdfData = {
    memo: {
      memoNumber: memo.memoNumber,
      raNumber: memo.raNumber,
      createdAt: memo.createdAt,
      totalAskValue: memo.totalAskValue,
      destination: memo.destination,
      baggieManifest: memo.baggieManifest,
    },
    pharmacy: {
      name: pharmacyData.name,
      address: physicalAddress.street || null,
      city: physicalAddress.city || null,
      state: physicalAddress.state || null,
      zipCode: physicalAddress.zip || null,
      phone: pharmacyData.phone,
      fax: pharmacyData.fax_number,
      deaNumber: pharmacyData.dea_number,
      deaExpiration: pharmacyData.dea_expiration_date,
    },
    labeler: {
      labelerId: labelerInfo.labeler_id,
      labelerName: labelerInfo.manufacturer_name,
      address: labelerInfo.address_1,
      city: labelerInfo.city,
      state: labelerInfo.state,
      zipCode: labelerInfo.zip,
      phone: labelerInfo.main_phone,
      fax: labelerInfo.fax,
    },
    items: items.map(item => {
      const transactionItem = item.transactionItemId ? transactionItemsMap.get(item.transactionItemId) : null;
      const totalQty = item.quantity || 0;
      const isPartial = transactionItem?.is_partial || false;
      const pkgSizeRaw = transactionItem?.full_package_size ?? null;

      return {
        ndc: item.ndc,
        drugName: item.productName || transactionItem?.proprietary_name || transactionItem?.generic_name,
        lotNumber: item.lotNumber,
        expirationDate: item.expirationDate,
        packageSize: pkgSizeRaw != null ? String(pkgSizeRaw) : '—',
        fullQuantity: isPartial ? 0 : totalQty,
        partialQuantity: isPartial ? totalQty : 0,
        askPrice: item.askPrice,
        askValue: item.askPrice ? item.askPrice * totalQty : null,
      };
    }),
    // Top header: Warehouse/FCR company info
    warehouse: {
      companyName: 'FCR First Class Return LLC',
      address: warehouseData ? [
        warehouseData.street,
        warehouseData.city,
        warehouseData.state,
        warehouseData.zip
      ].filter(Boolean).join(', ') : null,
      phone: warehouseData?.phone || null,
    },
    // "Remit Credits to:" section - Hardcoded for now
    remitTo: {
      companyName: 'Cardinal Health',
      address: '7000 Cardinal Place, Dublin, Ohio 42017',
      phone: '(614) 757-4804',
      fax: '(614) 553-6255',
    },
  };

  return pdfData;
};

// ============================================================
// Debit Memo Summary for a Return Transaction
// ============================================================

export interface DebitMemoSummaryData {
  licensePlate: string;
  processorName: string | null;
  returnDate: string | null;
  closeOutDate: string | null;
  batchMonth: string;
  cardinalBatch: string;
  pharmacy: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    deaNumber: string | null;
    contact: string | null;
    phone: string | null;
    email: string | null;
  };
  memos: Array<{
    memoNumber: string;
    labelerName: string | null;
    destination: string | null;
    raNeeded: boolean;
    totalAskValue: number;
  }>;
  grandTotal: number;
}

export const getDebitMemoSummaryData = async (
  returnTransactionId: string,
  batchId: string
): Promise<DebitMemoSummaryData> => {
  const sb = ensureAdmin();

  // 1. Get return transaction details
  const { data: returnTx, error: returnError } = await sb
    .from('return_transactions')
    .select('id, license_plate, pharmacy_id, processor_id, created_at, finalized_at, batch_id')
    .eq('id', returnTransactionId)
    .single();

  if (returnError) throw new AppError(`Failed to get return transaction: ${returnError.message}`, 400);

  // 2. Get pharmacy details
  const { data: pharmacyData, error: pharmacyError } = await sb
    .from('pharmacy')
    .select('id, name, pharmacy_name, physical_address, phone, contact_phone, dea_number, email')
    .eq('id', returnTx.pharmacy_id)
    .single();

  if (pharmacyError) throw new AppError(`Failed to get pharmacy: ${pharmacyError.message}`, 400);

  // 3. Get processor name
  let processorName: string | null = null;
  if (returnTx.processor_id) {
    const { data: processorData } = await sb
      .from('processors')
      .select('name')
      .eq('id', returnTx.processor_id)
      .single();
    processorName = processorData?.name || null;
  }

  // 4. Get batch info
  const { data: batchData, error: batchError } = await sb
    .from('return_batches')
    .select('batch_name, batch_month, closed_at')
    .eq('id', batchId)
    .single();

  if (batchError) throw new AppError(`Failed to get batch: ${batchError.message}`, 400);

  // 5. Find all debit memos in this batch whose items belong to this return transaction
  const { data: memoRows, error: memoError } = await sb
    .rpc('list_debit_memos', {
      p_batch_id: batchId,
      p_pharmacy_id: returnTx.pharmacy_id,
      p_limit: 500,
    });

  if (memoError) throw new AppError(`Failed to list debit memos: ${memoError.message}`, 400);

  const allMemos: any[] = memoRows?.data || [];

  // 6. For each memo, check if it has items from this return transaction
  const relevantMemos: DebitMemoSummaryData['memos'] = [];

  for (const memo of allMemos) {
    const { data: itemCheck } = await sb
      .from('debit_memo_items')
      .select('id, transaction_item_id')
      .eq('debit_memo_id', memo.id);

    if (!itemCheck || itemCheck.length === 0) continue;

    const txItemIds = itemCheck
      .map((i: any) => i.transaction_item_id)
      .filter(Boolean);

    if (txItemIds.length === 0) continue;

    const { data: matchingItems } = await sb
      .from('return_transaction_items')
      .select('id')
      .in('id', txItemIds)
      .eq('transaction_id', returnTransactionId);

    if (matchingItems && matchingItems.length > 0) {
      relevantMemos.push({
        memoNumber: memo.memoNumber,
        labelerName: memo.labelerName,
        destination: memo.destination,
        raNeeded: !!memo.raNumber || !!memo.raRequestedAt,
        totalAskValue: memo.totalAskValue || 0,
      });
    }
  }

  const physicalAddress = pharmacyData.physical_address || {};

  return {
    licensePlate: returnTx.license_plate,
    processorName,
    returnDate: returnTx.created_at,
    closeOutDate: batchData.closed_at,
    batchMonth: new Date(batchData.batch_month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
    cardinalBatch: batchData.batch_name,
    pharmacy: {
      name: pharmacyData.pharmacy_name || pharmacyData.name,
      address: physicalAddress.street || null,
      city: physicalAddress.city || null,
      state: physicalAddress.state || null,
      zipCode: physicalAddress.zip || null,
      deaNumber: pharmacyData.dea_number,
      contact: null,
      phone: pharmacyData.phone || pharmacyData.contact_phone,
      email: pharmacyData.email || null,
    },
    memos: relevantMemos,
    grandTotal: relevantMemos.reduce((sum, m) => sum + m.totalAskValue, 0),
  };
};
