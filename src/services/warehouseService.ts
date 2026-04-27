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
  serialNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  actualQuantity: number | null;
  verified: boolean;
  verificationStatus: string | null;
  conditionNotes: string | null;
  returnStatus: string;
  destination: string | null;
  wineCellarId?: string | null;
  dosageForm?: string | null;
  isPartial?: boolean;
  estimatedValue: number | null;
  discrepancyId?: string | null;
}

export interface SurplusItem {
  id: string;
  transactionId: string;
  ndc: string | null;
  productName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  warehouseLocation: string;
  condition: string;
  notes: string | null;
  status: string;
  assignedReturnId: string | null;
  reportedBy: string | null;
  createdAt: string;
  discrepancyId?: string | null;
}

export interface VerificationSummary {
  transaction: ReturnTransaction;
  items: VerifiedItem[];
  counts: {
    totalItems: number;
    correct: number;
    damaged: number;
    missing: number;
    wrongItem: number;
    unverified: number;
    surplus: number;
  };
  surplus: SurplusItem[];
  discrepancies: WarehouseDiscrepancy[];
  discrepancyCounts: { total: number; open: number };
}

// ============================================================
// Task 9.1: Scan a single box tracking number
//   - Scans one tracking number at a time
//   - When all packages for a return are scanned → status = 'received'
// ============================================================

export interface ScanProgress {
  totalPackages: number;
  scannedCount: number;
  allScanned: boolean;
  scannedKeys?: string[];
}

export interface ScanBoxResult {
  transaction: ReturnTransaction;
  scanProgress: ScanProgress;
  alreadyScanned: boolean;
  message: string;
}

export const scanBox = async (
  trackingNumber: string
): Promise<ScanBoxResult> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_scan_box', {
    p_tracking_number: trackingNumber,
  });

  handleRpcError(data, error, 'Failed to scan box');
  return {
    transaction: data.data as ReturnTransaction,
    scanProgress: data.scanProgress as ScanProgress,
    alreadyScanned: data.alreadyScanned ?? false,
    message: data.message ?? '',
  };
};

// Legacy: single-scan receive (kept for backward compatibility)
export const receiveReturn = async (
  fedexTracking: string
): Promise<ReturnTransaction> => {
  const result = await scanBox(fedexTracking);
  return result.transaction;
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
  limit?: number,
  verificationStatus?: string
): Promise<{ data: ReturnTransaction[]; pagination: any }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_list_received', {
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
    p_verification_status: verificationStatus || null,
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

// ============================================================
// Start verification session (record box count)
// ============================================================

export interface StartVerificationResult {
  transaction: ReturnTransaction;
  expectedBoxes: number;
  receivedBoxes: number;
  boxCountMatch: boolean;
  totalItems: number;
}

export const startVerification = async (
  transactionId: string,
  boxCount: number,
  verifiedBy?: string
): Promise<StartVerificationResult> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_start_verification', {
    p_transaction_id: transactionId,
    p_box_count: boxCount,
    p_verified_by: verifiedBy || null,
  });

  handleRpcError(data, error, 'Failed to start verification');
  return data.data as StartVerificationResult;
};

// ============================================================
// Verify item v2 (correct/damaged/missing/wrong_item)
// ============================================================

export const verifyItemV2 = async (
  transactionId: string,
  itemId: string,
  verificationStatus: string,
  actualQuantity?: number,
  conditionNotes?: string,
  reportedBy?: string
): Promise<VerifiedItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_verify_item_v2', {
    p_transaction_id: transactionId,
    p_item_id: itemId,
    p_verification_status: verificationStatus,
    p_actual_quantity: actualQuantity ?? null,
    p_condition_notes: conditionNotes || null,
    p_reported_by: reportedBy || null,
  });

  handleRpcError(data, error, 'Failed to verify item');
  return data.data as VerifiedItem;
};

// ============================================================
// Add surplus item
// ============================================================

export const addSurplus = async (input: {
  transactionId: string;
  ndc?: string;
  productName?: string;
  manufacturer?: string;
  lotNumber?: string;
  expirationDate?: string;
  quantity?: number;
  warehouseLocation: string;
  condition?: string;
  notes?: string;
  reportedBy?: string;
}): Promise<SurplusItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_add_surplus', {
    p_transaction_id: input.transactionId,
    p_ndc: input.ndc || null,
    p_product_name: input.productName || null,
    p_manufacturer: input.manufacturer || null,
    p_lot_number: input.lotNumber || null,
    p_expiration_date: input.expirationDate || null,
    p_quantity: input.quantity ?? 1,
    p_warehouse_location: input.warehouseLocation,
    p_condition: input.condition || 'good',
    p_notes: input.notes || null,
    p_reported_by: input.reportedBy || null,
  });

  handleRpcError(data, error, 'Failed to add surplus item');
  return data.data as SurplusItem;
};

// ============================================================
// Complete verification
// ============================================================

export interface CompleteVerificationResult {
  transaction: ReturnTransaction;
  summary: {
    totalItems: number;
    correctItems: number;
    damagedItems: number;
    missingItems: number;
    wrongItems: number;
    surplusItems: number;
    openDiscrepancies: number;
    correctItemsValue: number;
    allItemsIntact: boolean;
  };
}

export const completeVerification = async (
  transactionId: string,
  notes?: string,
  verifiedBy?: string
): Promise<CompleteVerificationResult> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_complete_verification', {
    p_transaction_id: transactionId,
    p_notes: notes || null,
    p_verified_by: verifiedBy || null,
  });

  handleRpcError(data, error, 'Failed to complete verification');
  return data.data as CompleteVerificationResult;
};

// ============================================================
// Resolve discrepancy
// ============================================================

export const resolveDiscrepancy = async (
  discrepancyId: string,
  resolution: string,
  resolutionNotes?: string,
  resolvedBy?: string
): Promise<WarehouseDiscrepancy> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_resolve_discrepancy', {
    p_discrepancy_id: discrepancyId,
    p_resolution: resolution,
    p_resolution_notes: resolutionNotes || null,
    p_resolved_by: resolvedBy || null,
  });

  handleRpcError(data, error, 'Failed to resolve discrepancy');
  const resolved = data.data as WarehouseDiscrepancy;

  // If the discrepancy is linked to an item, reset that item back to
  // unverified so the warehouse admin can re-verify it and the counts update.
  if (resolved.itemId) {
    await sb
      .from('return_transaction_items')
      .update({
        verified: false,
        verification_status: null,
        condition_notes: null,
        return_status: 'returnable',
      })
      .eq('id', resolved.itemId);

    // Recalculate totals on the parent return transaction
    if (resolved.transactionId) {
      const { data: items } = await sb
        .from('return_transaction_items')
        .select('return_status, estimated_value')
        .eq('transaction_id', resolved.transactionId);

      if (items) {
        const returnableVal = items
          .filter((i: any) => i.return_status === 'returnable')
          .reduce((sum: number, i: any) => sum + (i.estimated_value || 0), 0);
        const nonReturnableVal = items
          .filter((i: any) => i.return_status === 'non_returnable')
          .reduce((sum: number, i: any) => sum + (i.estimated_value || 0), 0);

        await sb
          .from('return_transactions')
          .update({
            total_returnable_value: returnableVal,
            total_non_returnable_value: nonReturnableVal,
          })
          .eq('id', resolved.transactionId);
      }
    }
  }

  return resolved;
};

// ============================================================
// Get verification summary
// ============================================================

export const getVerificationSummary = async (
  transactionId: string
): Promise<VerificationSummary> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_get_verification_summary', {
    p_transaction_id: transactionId,
  });

  handleRpcError(data, error, 'Failed to get verification summary');

  const summary = data.data as VerificationSummary;

  // Enrich summary items with fields not currently returned by the RPC payload.
  if (summary.items && summary.items.length > 0) {
    const itemIds = summary.items.map((item: VerifiedItem) => item.id);
    const { data: rawItems } = await sb
      .from('return_transaction_items')
      .select('id, serial_number, destination, wine_cellar_id, dosage_form, is_partial')
      .in('id', itemIds);

    if (rawItems && rawItems.length > 0) {
      const itemMap: Record<string, {
        serialNumber: string | null;
        destination: string | null;
        wineCellarId: string | null;
        dosageForm: string | null;
        isPartial: boolean;
      }> = {};

      for (const row of rawItems) {
        itemMap[row.id] = {
          serialNumber: row.serial_number ?? null,
          destination: row.destination ?? null,
          wineCellarId: row.wine_cellar_id ?? null,
          dosageForm: row.dosage_form ?? null,
          isPartial: Boolean(row.is_partial),
        };
      }

      for (const item of summary.items) {
        const merged = itemMap[item.id];
        if (!merged) continue;
        (item as VerifiedItem).serialNumber = merged.serialNumber;
        (item as VerifiedItem).destination = merged.destination;
        (item as VerifiedItem).wineCellarId = merged.wineCellarId;
        (item as VerifiedItem).dosageForm = merged.dosageForm;
        (item as VerifiedItem).isPartial = merged.isPartial;
      }
    }
  }

  return summary;
};

// ============================================================
// List surplus items for a transaction
// ============================================================

export const listSurplus = async (
  transactionId: string,
  status?: string
): Promise<{ data: SurplusItem[]; total: number }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_list_surplus', {
    p_transaction_id: transactionId,
    p_status: status || null,
  });

  handleRpcError(data, error, 'Failed to list surplus items');
  return { data: data.data as SurplusItem[], total: data.total };
};

// ============================================================
// List all surplus items (across all returns)
// ============================================================

export const listAllSurplus = async (
  status?: string,
  search?: string,
  page?: number,
  limit?: number
): Promise<{ data: SurplusItem[]; pagination: any }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('warehouse_list_all_surplus', {
    p_status: status || null,
    p_search: search || null,
    p_page: page || 1,
    p_limit: limit || 20,
  });

  handleRpcError(data, error, 'Failed to list all surplus items');
  return { data: data.data as SurplusItem[], pagination: data.pagination };
};
