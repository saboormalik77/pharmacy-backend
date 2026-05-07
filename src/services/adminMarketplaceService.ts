import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

export interface MarketplaceDeal {
  id: string;
  dealNumber: string;
  productName: string;
  category: string;
  ndc: string | null;
  quantity: number;
  unit: string;
  originalPrice: number;
  dealPrice: number;
  savings: number;
  margin: number;
  distributorId: string | null;
  distributor: string;
  expiryDate: string;
  postedDate: string;
  status: string;
  notes: string | null;
  imageUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Featured deal fields
  isDealOfTheDay?: boolean;
  dealOfTheDayUntil?: string | null;
  isDealOfTheWeek?: boolean;
  dealOfTheWeekUntil?: string | null;
  isDealOfTheMonth?: boolean;
  dealOfTheMonthUntil?: string | null;
}

export interface MarketplaceStats {
  totalDeals: number;
  activeDeals: number;
  soldDeals: number;
  expiredDeals: number;
  totalItems: number;
  totalValue?: number;
  avgSavings?: number;
  categories?: string[];
}

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MarketplaceListResponse {
  deals: MarketplaceDeal[];
  stats: MarketplaceStats;
  pagination: PaginationInfo;
}

export interface CreateDealData {
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  originalPrice: number;
  dealPrice: number;
  distributorName: string;
  expiryDate: string;
  ndc?: string;
  distributorId?: string;
  notes?: string;
  imageUrl?: string;
  createdBy?: string;
  minimumBuyQuantity?: number;
}

export interface UpdateDealData {
  productName?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  originalPrice?: number;
  dealPrice?: number;
  distributorName?: string;
  expiryDate?: string;
  ndc?: string;
  status?: string;
  notes?: string;
  imageUrl?: string;
  minimumBuyQuantity?: number;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get list of marketplace deals with stats, pagination, and filters
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getMarketplaceDeals = async (
  page: number = 1,
  limit: number = 12,
  search?: string,
  category?: string,
  status?: string,
  sortBy: string = 'posted_date',
  sortOrder: string = 'desc'
): Promise<MarketplaceListResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_marketplace_deals_list', {
    p_page: page,
    p_limit: limit,
    p_search: search || null,
    p_category: category || null,
    p_status: status || null,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
  });

  if (error) {
    throw new AppError(`Failed to fetch marketplace deals: ${error.message}`, 400);
  }

  return {
    deals: data.deals || [],
    stats: data.stats,
    pagination: data.pagination,
  };
};

/**
 * Get marketplace deal by ID
 * Uses PostgreSQL RPC function
 */
export const getMarketplaceDealById = async (dealId: string): Promise<MarketplaceDeal> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_marketplace_deal_by_id', {
    p_deal_id: dealId,
  });

  if (error) {
    throw new AppError(`Failed to fetch marketplace deal: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 404);
  }

  return data.deal;
};

/**
 * Create new marketplace deal
 * Uses PostgreSQL RPC function
 */
export const createMarketplaceDeal = async (
  dealData: CreateDealData
): Promise<MarketplaceDeal> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('create_marketplace_deal', {
    p_product_name: dealData.productName,
    p_category: dealData.category,
    p_quantity: dealData.quantity,
    p_unit: dealData.unit,
    p_original_price: dealData.originalPrice,
    p_deal_price: dealData.dealPrice,
    p_distributor_name: dealData.distributorName,
    p_expiry_date: dealData.expiryDate,
    p_ndc: dealData.ndc || null,
    p_distributor_id: dealData.distributorId || null,
    p_notes: dealData.notes || null,
    p_image_url: dealData.imageUrl || null,
    p_created_by: dealData.createdBy || null,
    p_minimum_buy_quantity: dealData.minimumBuyQuantity || 1,
  });

  if (error) {
    throw new AppError(`Failed to create marketplace deal: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.deal;
};

/**
 * Update marketplace deal
 * Uses PostgreSQL RPC function
 */
export const updateMarketplaceDeal = async (
  dealId: string,
  updateData: UpdateDealData
): Promise<MarketplaceDeal> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('update_marketplace_deal', {
    p_deal_id: dealId,
    p_product_name: updateData.productName || null,
    p_category: updateData.category || null,
    p_quantity: updateData.quantity ?? null,
    p_unit: updateData.unit || null,
    p_original_price: updateData.originalPrice ?? null,
    p_deal_price: updateData.dealPrice ?? null,
    p_distributor_name: updateData.distributorName || null,
    p_expiry_date: updateData.expiryDate || null,
    p_ndc: updateData.ndc || null,
    p_status: updateData.status || null,
    p_notes: updateData.notes || null,
    p_image_url: updateData.imageUrl || null,
    p_minimum_buy_quantity: updateData.minimumBuyQuantity ?? null,
  });

  if (error) {
    throw new AppError(`Failed to update marketplace deal: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.deal;
};

/**
 * Delete marketplace deal
 * Uses PostgreSQL RPC function
 */
export const deleteMarketplaceDeal = async (dealId: string): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('delete_marketplace_deal', {
    p_deal_id: dealId,
  });

  if (error) {
    throw new AppError(`Failed to delete marketplace deal: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }
};

/**
 * Get marketplace categories
 * Uses PostgreSQL RPC function
 */
export const getMarketplaceCategories = async (): Promise<CategoryOption[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_marketplace_categories');

  if (error) {
    throw new AppError(`Failed to fetch marketplace categories: ${error.message}`, 400);
  }

  return data.categories || [];
};

/**
 * Get marketplace stats
 * Uses PostgreSQL RPC function
 */
export const getMarketplaceStats = async (): Promise<MarketplaceStats> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_marketplace_stats');

  if (error) {
    throw new AppError(`Failed to fetch marketplace stats: ${error.message}`, 400);
  }

  return data;
};

/**
 * Mark deal as sold
 * Uses PostgreSQL RPC function
 */
export const markDealAsSold = async (dealId: string): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('mark_marketplace_deal_sold', {
    p_deal_id: dealId,
  });

  if (error) {
    throw new AppError(`Failed to mark deal as sold: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }
};

// ============================================================
// Featured Deal Type
// ============================================================
export type FeaturedDealType = 'day' | 'week' | 'month';

/**
 * Set Featured Deal (supports day, week, month via type parameter)
 * Used by: POST /api/admin/marketplace/deals/:id/set-deal-of-the-day
 */
export const setDealOfTheDay = async (
  dealId: string,
  expiresAt?: string,
  type: FeaturedDealType = 'day'
): Promise<{ message: string; dealId: string; productName: string; type: string; expiresAt?: string }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const expiresAtTimestamp = expiresAt ? new Date(expiresAt).toISOString() : null;

  const { data, error } = await supabaseAdmin.rpc('set_featured_deal', {
    p_deal_id: dealId,
    p_type: type,
    p_expires_at: expiresAtTimestamp,
  });

  if (error) {
    throw new AppError(`Failed to set featured deal: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return {
    message: data.message,
    dealId: data.dealId,
    productName: data.productName,
    type: data.type,
    expiresAt: data.expiresAt || undefined,
  };
};

/**
 * Unset Featured Deal (supports day, week, month via type parameter)
 * Used by: DELETE /api/admin/marketplace/deal-of-the-day
 */
export const unsetDealOfTheDay = async (
  type: FeaturedDealType = 'day'
): Promise<{ message: string; type: string; dealsUnset: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('unset_featured_deal', {
    p_type: type,
  });

  if (error) {
    throw new AppError(`Failed to unset featured deal: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return {
    message: data.message,
    type: data.type,
    dealsUnset: data.dealsUnset,
  };
};

/**
 * Get Featured Deal info (supports day, week, month via type parameter)
 * Used by: GET /api/admin/marketplace/deal-of-the-day
 */
export const getDealOfTheDayInfo = async (
  type: FeaturedDealType = 'day'
): Promise<{
  type: string;
  typeLabel: string;
  deal: MarketplaceDeal | null;
  manualDeal: any;
  hasManualSelection: boolean;
}> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_featured_deal_info', {
    p_type: type,
  });

  if (error) {
    throw new AppError(`Failed to get featured deal info: ${error.message}`, 400);
  }

  return {
    type: data.type,
    typeLabel: data.typeLabel,
    deal: data.deal?.deal || null,
    manualDeal: data.manualDeal || null,
    hasManualSelection: data.hasManualSelection || false,
  };
};

/**
 * Get all featured deals info (day, week, month) for admin
 * Used by: GET /api/admin/marketplace/featured-deals
 */
export const getAllFeaturedDealsInfo = async (): Promise<{
  dealOfTheDay: MarketplaceDeal | null;
  dealOfTheWeek: MarketplaceDeal | null;
  dealOfTheMonth: MarketplaceDeal | null;
}> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_all_featured_deals');

  if (error) {
    throw new AppError(`Failed to get featured deals: ${error.message}`, 400);
  }

  return {
    dealOfTheDay: data.dealOfTheDay?.deal || null,
    dealOfTheWeek: data.dealOfTheWeek?.deal || null,
    dealOfTheMonth: data.dealOfTheMonth?.deal || null,
  };
};

