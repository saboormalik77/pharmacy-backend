/**
 * Wine Cellar Service
 *
 * Thin RPC callers for wine_cellar table — staging area for
 * pharmaceutical items awaiting future return eligibility.
 *
 * ALL business logic lives in PostgreSQL RPC functions.
 * This service contains ZERO query-building.
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

export interface WineCellarItem {
  id: string;
  pharmacyId: string;
  pharmacyName: string | null;
  transactionItemId: string | null;
  ndc: string | null;
  ndc10: string | null;
  productName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  standardPrice: number | null;
  estimatedValue: number | null;
  isPartial: boolean;
  partialPercentage: number | null;
  dateShelved: string;
  expectedReturnableDate: string | null;
  physicalLocation: string | null;
  baggieBarcode: string | null;
  status: 'shelved' | 'ready_to_return' | 'returned' | 'destroyed';
  returnedInTransactionId: string | null;
  returnedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddToWineCellarInput {
  pharmacyId: string;
  transactionItemId?: string;
  ndc?: string;
  ndc10?: string;
  productName?: string;
  manufacturer?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: string;
  quantity?: number;
  standardPrice?: number;
  isPartial?: boolean;
  partialPercentage?: number;
  expectedReturnableDate?: string;
  physicalLocation?: string;
  baggieBarcode?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateWineCellarInput {
  physicalLocation?: string;
  baggieBarcode?: string;
  notes?: string;
  quantity?: number;
  standardPrice?: number;
  expectedReturnableDate?: string;
  isPartial?: boolean;
  partialPercentage?: number;
}

export interface WineCellarListFilters {
  pharmacyId?: string;
  status?: string;
  search?: string;
  expectedMonth?: string;
  page?: number;
  limit?: number;
}

export interface WineCellarListResponse {
  items: WineCellarItem[];
  summary: {
    totalItems: number;
    totalShelved: number;
    totalReady: number;
    totalValue: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WineCellarStats {
  totalItems: number;
  shelved: number;
  readyToReturn: number;
  returned: number;
  destroyed: number;
  totalValue: number;
}

export interface SurfaceResult {
  surfacedCount: number;
  items: WineCellarItem[];
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
// RPC wrappers — zero JS query-building
// ============================================================

export const addToWineCellar = async (
  input: AddToWineCellarInput
): Promise<WineCellarItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('add_to_wine_cellar', {
    p_data: {
      pharmacy_id:              input.pharmacyId,
      transaction_item_id:      input.transactionItemId || null,
      ndc:                      input.ndc || null,
      ndc_10:                   input.ndc10 || null,
      product_name:             input.productName || null,
      manufacturer:             input.manufacturer || null,
      lot_number:               input.lotNumber || null,
      serial_number:            input.serialNumber || null,
      expiration_date:          input.expirationDate || null,
      quantity:                 input.quantity ?? 1,
      standard_price:           input.standardPrice ?? null,
      is_partial:               input.isPartial ?? false,
      partial_percentage:       input.partialPercentage ?? null,
      expected_returnable_date: input.expectedReturnableDate || null,
      physical_location:        input.physicalLocation || null,
      baggie_barcode:           input.baggieBarcode || null,
      notes:                    input.notes || null,
      created_by:               input.createdBy || null,
    },
  });

  handleRpcError(data, error, 'Failed to add item to wine cellar');
  return data.data as WineCellarItem;
};

export const listWineCellarItems = async (
  filters: WineCellarListFilters
): Promise<WineCellarListResponse> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('list_wine_cellar_items', {
    p_pharmacy_id:    filters.pharmacyId || null,
    p_status:         filters.status || null,
    p_search:         filters.search || null,
    p_expected_month: filters.expectedMonth || null,
    p_page:           filters.page || 1,
    p_limit:          filters.limit || 50,
  });

  handleRpcError(data, error, 'Failed to list wine cellar items');
  return data.data as WineCellarListResponse;
};

export const getWineCellarItem = async (
  id: string
): Promise<WineCellarItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('get_wine_cellar_item', {
    p_id: id,
  });

  handleRpcError(data, error, 'Failed to fetch wine cellar item');
  return data.data as WineCellarItem;
};

export const updateWineCellarItem = async (
  id: string,
  updates: UpdateWineCellarInput
): Promise<WineCellarItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('update_wine_cellar_item', {
    p_id: id,
    p_updates: {
      ...(updates.physicalLocation !== undefined && { physical_location: updates.physicalLocation }),
      ...(updates.baggieBarcode !== undefined && { baggie_barcode: updates.baggieBarcode }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.quantity !== undefined && { quantity: updates.quantity }),
      ...(updates.standardPrice !== undefined && { standard_price: updates.standardPrice }),
      ...(updates.expectedReturnableDate !== undefined && { expected_returnable_date: updates.expectedReturnableDate }),
      ...(updates.isPartial !== undefined && { is_partial: updates.isPartial }),
      ...(updates.partialPercentage !== undefined && { partial_percentage: updates.partialPercentage }),
    },
  });

  handleRpcError(data, error, 'Failed to update wine cellar item');
  return data.data as WineCellarItem;
};

export const markAsReturned = async (
  id: string,
  transactionId: string
): Promise<WineCellarItem> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('mark_wine_cellar_returned', {
    p_id: id,
    p_transaction_id: transactionId,
  });

  handleRpcError(data, error, 'Failed to mark wine cellar item as returned');
  return data.data as WineCellarItem;
};

export const checkAndSurfaceReadyItems = async (): Promise<SurfaceResult> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('check_and_surface_ready_items');

  handleRpcError(data, error, 'Failed to check and surface ready items');
  return data.data as SurfaceResult;
};

export const getWineCellarStats = async (
  pharmacyId?: string
): Promise<WineCellarStats> => {
  const sb = ensureAdmin();

  const { data, error } = await sb.rpc('get_wine_cellar_stats', {
    p_pharmacy_id: pharmacyId || null,
  });

  handleRpcError(data, error, 'Failed to fetch wine cellar stats');
  return data.data as WineCellarStats;
};
