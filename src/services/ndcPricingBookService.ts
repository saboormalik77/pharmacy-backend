/**
 * NDC Pricing Book Service
 *
 * Thin RPC callers — all business logic lives in PostgreSQL RPC functions
 * (see scripts/fcr_28_ndc_pricing_book.sql).
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

export interface NDCPricingRecord {
  id: string;
  ndc: string;
  ndcNormalized: string;
  productName: string | null; // Optional: for display purposes only
  currentPrice: number | null;
  lastPrice: number | null;
  estimatedStorePrice: number | null;
  lastReimbursement: number | null;
  priceSource: string | null;
  closeOutDestination: string | null;
  lastPriceUpdate: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertNDCPricingData {
  ndc: string;
  productName?: string; // Optional: for display purposes only
  currentPrice?: number;
  estimatedStorePrice?: number;
  lastReimbursement?: number;
  priceSource?: string;
  closeOutDestination?: string;
  lastPriceUpdate?: string;
  userId?: string;
}

export interface SearchParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PriceResolution {
  found: boolean;
  /** Average ask price computed from real payment history (FCR-56). Preferred over currentPrice when present. */
  avgAskPrice: number | null;
  /** Manually-entered price from the NDC pricing book. Used as fallback when avgAskPrice is absent. */
  currentPrice: number | null;
  estimatedStorePrice: number | null;
  priceSource: string | null;
  closeOutDestination: string | null;
  lastPriceUpdate: string | null;
  productName: string | null;
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

function handleRpcResult(data: any, rpcError: any, label: string) {
  if (rpcError) {
    throw new AppError(`${label}: ${rpcError.message}`, 400);
  }
  if (!data) {
    throw new AppError(`${label}: no data returned`, 500);
  }
  if (data.error) {
    throw new AppError(data.message || label, data.code || 400);
  }
  return data;
}

// ============================================================
// RPC Wrappers
// ============================================================

export const upsertNDCPricing = async (
  input: UpsertNDCPricingData
): Promise<NDCPricingRecord> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('upsert_ndc_pricing', { p_data: input });
  handleRpcResult(data, error, 'Failed to upsert NDC pricing');
  return data.data as NDCPricingRecord;
};

export const getNDCPricingByNdc = async (
  ndc: string
): Promise<NDCPricingRecord> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_ndc_pricing', { p_ndc: ndc });
  handleRpcResult(data, error, 'Failed to get NDC pricing');
  return data.data as NDCPricingRecord;
};

export const searchNDCPricingBook = async (
  params: SearchParams
): Promise<{ items: NDCPricingRecord[]; pagination: any }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('search_ndc_pricing_book', {
    p_search: params.search || '',
    p_page: params.page || 1,
    p_limit: params.limit || 25,
    p_sort_by: params.sortBy || 'updated_at',
    p_sort_order: params.sortOrder || 'desc',
  });
  handleRpcResult(data, error, 'Failed to search NDC pricing');
  return data.data as { items: NDCPricingRecord[]; pagination: any };
};

export const deleteNDCPricing = async (id: string): Promise<void> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('delete_ndc_pricing', { p_id: id });
  handleRpcResult(data, error, 'Failed to delete NDC pricing');
};

export const resolveNDCPrice = async (
  ndc: string
): Promise<PriceResolution> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('resolve_ndc_price', { p_ndc: ndc });
  if (error) {
    throw new AppError(`Failed to resolve NDC price: ${error.message}`, 400);
  }
  return data as PriceResolution;
};

export const importFromReports = async (
  userId?: string
): Promise<{ imported: number }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('import_ndc_pricing_from_reports', {
    p_user_id: userId || null,
  });
  handleRpcResult(data, error, 'Failed to import pricing from reports');
  return data.data as { imported: number };
};
