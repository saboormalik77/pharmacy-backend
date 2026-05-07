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
  totalSavingsAmount: number;
  distributor: string;
  expiryDate: string;
  postedDate: string;
  status: string;
  imageUrl: string | null;
  notes: string | null;
  inCart?: boolean;
  cartQuantity?: number;
  // Featured deal fields
  isDealOfTheDay: boolean;
  dealOfTheDayUntil: string | null;
  isDealOfTheWeek: boolean;
  dealOfTheWeekUntil: string | null;
  isDealOfTheMonth: boolean;
  dealOfTheMonthUntil: string | null;
}

export interface MarketplaceStats {
  totalDeals: number;
  activeDeals: number;
  soldDeals: number;
  expiredDeals: number;
  totalItems: number;
  avgSavings: number;
  categories: string[];
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

export interface CartItem {
  id: string;
  dealId: string;
  productName: string;
  ndc: string | null;
  category: string;
  distributor: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  totalPrice: number;
  savings: number;
  savingsPercent: number;
  imageUrl: string | null;
  availableQuantity: number;
  dealStatus: string;
  expiryDate: string;
  addedAt: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  totalSavings: number;
  estimatedTax: number;
  total: number;
}

export interface CartResponse {
  items: CartItem[];
  summary: CartSummary;
}

export interface AddToCartResponse {
  error: boolean;
  message: string;
  item?: {
    dealId: string;
    productName: string;
    ndc: string | null;
    distributor: string;
    quantity: number;
    unitPrice: number;
    originalPrice: number;
    totalPrice: number;
    savings: number;
    imageUrl: string | null;
  };
}

export interface CartValidationIssue {
  itemId: string;
  dealId: string;
  productName: string;
  issue: string;
}

export interface CartValidationResponse {
  valid: boolean;
  message: string;
  issues: CartValidationIssue[];
  items: CartItem[];
  summary: CartSummary;
}

// ============================================================
// Service Functions - All use PostgreSQL RPC (no custom JS logic)
// ============================================================

/**
 * Get list of active marketplace deals for pharmacy
 * Uses PostgreSQL RPC function
 */
export const getMarketplaceDeals = async (
  pharmacyId: string,
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

  const { data, error } = await supabaseAdmin.rpc('get_pharmacy_marketplace_deals', {
    p_pharmacy_id: pharmacyId,
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
export const getMarketplaceDealById = async (
  pharmacyId: string,
  dealId: string
): Promise<MarketplaceDeal> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_pharmacy_marketplace_deal_by_id', {
    p_pharmacy_id: pharmacyId,
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

// ============================================================
// Featured Deal Type
// ============================================================
export type FeaturedDealType = 'day' | 'week' | 'month';

/**
 * Get Featured Deal (supports day, week, month via type parameter)
 */
export const getDealOfTheDay = async (
  type: FeaturedDealType = 'day'
): Promise<MarketplaceDeal | null> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_manual_featured_deal', {
    p_type: type,
  });

  if (error) {
    throw new AppError(`Failed to get featured deal: ${error.message}`, 400);
  }

  if (data.error || !data.deal) {
    return null;
  }

  return data.deal as MarketplaceDeal;
};

/**
 * Get All Featured Deals (Day, Week, Month)
 */
export const getAllFeaturedDeals = async (): Promise<{
  dealOfTheDay: MarketplaceDeal | null;
  dealOfTheWeek: MarketplaceDeal | null;
  dealOfTheMonth: MarketplaceDeal | null;
}> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_all_manual_featured_deals');

  if (error) {
    throw new AppError(`Failed to get featured deals: ${error.message}`, 400);
  }

  return {
    dealOfTheDay: data.dealOfTheDay?.deal || null,
    dealOfTheWeek: data.dealOfTheWeek?.deal || null,
    dealOfTheMonth: data.dealOfTheMonth?.deal || null,
  };
};

export const getMarketplaceCategories = async (
  pharmacyId: string
): Promise<CategoryOption[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_pharmacy_marketplace_categories', {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw new AppError(`Failed to fetch marketplace categories: ${error.message}`, 400);
  }

  return data.categories || [];
};

/**
 * Add item to cart
 * Uses PostgreSQL RPC function
 */
export const addToCart = async (
  pharmacyId: string,
  dealId: string,
  quantity: number = 1
): Promise<AddToCartResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('add_to_pharmacy_cart', {
    p_pharmacy_id: pharmacyId,
    p_deal_id: dealId,
    p_quantity: quantity,
  });

  if (error) {
    throw new AppError(`Failed to add item to cart: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return {
    error: false,
    message: data.message,
    item: data.item,
  };
};

/**
 * Get pharmacy cart
 * Uses PostgreSQL RPC function
 */
export const getCart = async (pharmacyId: string): Promise<CartResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_pharmacy_cart', {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw new AppError(`Failed to fetch cart: ${error.message}`, 400);
  }

  return {
    items: data.items || [],
    summary: data.summary,
  };
};

/**
 * Update cart item quantity
 * Uses PostgreSQL RPC function
 */
export const updateCartItem = async (
  pharmacyId: string,
  itemId: string,
  quantity: number
): Promise<{ message: string; newQuantity: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('update_pharmacy_cart_item', {
    p_pharmacy_id: pharmacyId,
    p_item_id: itemId,
    p_quantity: quantity,
  });

  if (error) {
    throw new AppError(`Failed to update cart item: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return {
    message: data.message,
    newQuantity: data.newQuantity,
  };
};

/**
 * Remove item from cart
 * Uses PostgreSQL RPC function
 */
export const removeFromCart = async (
  pharmacyId: string,
  itemId: string
): Promise<{ message: string }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('remove_from_pharmacy_cart', {
    p_pharmacy_id: pharmacyId,
    p_item_id: itemId,
  });

  if (error) {
    throw new AppError(`Failed to remove item from cart: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return { message: data.message };
};

/**
 * Clear entire cart
 * Uses PostgreSQL RPC function
 */
export const clearCart = async (
  pharmacyId: string
): Promise<{ message: string; itemsRemoved: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('clear_pharmacy_cart', {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw new AppError(`Failed to clear cart: ${error.message}`, 400);
  }

  return {
    message: data.message,
    itemsRemoved: data.itemsRemoved,
  };
};

/**
 * Get cart item count
 * Uses PostgreSQL RPC function
 */
export const getCartCount = async (
  pharmacyId: string
): Promise<{ count: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_pharmacy_cart_count', {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw new AppError(`Failed to get cart count: ${error.message}`, 400);
  }

  return { count: data.count };
};

/**
 * Validate cart before checkout
 * Uses PostgreSQL RPC function
 */
export const validateCart = async (
  pharmacyId: string
): Promise<CartValidationResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('validate_pharmacy_cart', {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw new AppError(`Failed to validate cart: ${error.message}`, 400);
  }

  return {
    valid: data.valid,
    message: data.message,
    issues: data.issues || [],
    items: data.items || [],
    summary: data.summary,
  };
};

