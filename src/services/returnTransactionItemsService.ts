/**
 * Return Transaction Items Service
 *
 * Thin RPC callers only — zero JS query-building.
 * All business logic lives in PostgreSQL RPC functions
 * (see scripts/fcr_07_create_return_transaction_items.sql).
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

export interface ReturnTransactionItem {
  id: string;
  transactionId: string;
  ndc: string | null;
  ndc10: string | null;
  gtin: string | null;
  proprietaryName: string | null;
  genericName: string | null;
  manufacturer: string | null;
  packageDescription: string | null;
  dosageForm: string | null;
  strength: string | null;
  route: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  standardPrice: number | null;
  quantity: number;
  fullPackageSize: number | null;
  isPartial: boolean;
  partialPercentage: number | null;
  estimatedValue: number | null;
  returnStatus: string;
  nonReturnableReason: string | null;
  returnReason: string | null;
  destination: string | null;
  deaSchedule: string | null;
  deaForm222Required: boolean;
  productType: string | null;
  coStatus: string;
  bmpStatus: string;
  memo: string | null;
  wineCellarId: string | null;
  scanSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddItemData {
  transactionId: string;
  ndc?: string;
  ndc10?: string;
  gtin?: string;
  proprietaryName?: string;
  genericName?: string;
  manufacturer?: string;
  packageDescription?: string;
  dosageForm?: string;
  strength?: string;
  route?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: string;
  standardPrice?: number;
  quantity?: number;
  fullPackageSize?: number;
  isPartial?: boolean;
  partialPercentage?: number;
  returnStatus?: string;
  nonReturnableReason?: string;
  returnReason?: string;
  destination?: string;
  deaSchedule?: string;
  deaForm222Required?: boolean;
  productType?: string;
  coStatus?: string;
  bmpStatus?: string;
  memo?: string;
  scanSource?: string;
  rawScanData?: string;
}

export interface ItemsListResponse {
  items: ReturnTransactionItem[];
  summary: {
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    totalValue: number;
  };
}

// ============================================================
// Helpers
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
// RPC Wrappers
// ============================================================

export const addItem = async (
  itemData: AddItemData
): Promise<{ item: ReturnTransactionItem; duplicate: boolean; duplicateItemId: string | null }> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('add_return_transaction_item', {
    p_data: itemData,
  });

  handleRpcError(data, error, 'Failed to add item');

  return {
    item: data.data as ReturnTransactionItem,
    duplicate: data.duplicate || false,
    duplicateItemId: data.duplicateItemId || null,
  };
};

export const listItems = async (
  transactionId: string,
  returnStatus?: string,
  search?: string,
): Promise<ItemsListResponse> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('list_return_transaction_items', {
    p_transaction_id: transactionId,
    p_return_status: returnStatus || null,
    p_search: search || null,
  });

  handleRpcError(data, error, 'Failed to list items');
  return data as ItemsListResponse;
};

export const getItem = async (itemId: string): Promise<ReturnTransactionItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('get_return_transaction_item', {
    p_item_id: itemId,
  });

  handleRpcError(data, error, 'Failed to get item');
  return data.data as ReturnTransactionItem;
};

export const updateItem = async (
  itemId: string,
  updates: Partial<AddItemData>
): Promise<ReturnTransactionItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('update_return_transaction_item', {
    p_item_id: itemId,
    p_updates: updates,
  });

  handleRpcError(data, error, 'Failed to update item');
  return data.data as ReturnTransactionItem;
};

export const deleteItem = async (itemId: string): Promise<void> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('delete_return_transaction_item', {
    p_item_id: itemId,
  });

  handleRpcError(data, error, 'Failed to delete item');
};
