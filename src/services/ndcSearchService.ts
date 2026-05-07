/**
 * NDC Search Service
 * Provides fast NDC search using pre-computed pricing index
 * This is a NEW service - does NOT modify existing optimization logic
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

export interface DistributorPricing {
  id: string;
  name: string;
  fullPrice: number;
  partialPrice: number;
  email?: string;
  phone?: string;
  location?: string;
  reportDate?: string;
}

export interface NDCSearchResult {
  ndc: string;
  ndcNormalized: string;
  productName: string;
  distributors: DistributorPricing[];
  bestFullPrice: number;
  bestPartialPrice: number;
  lastUpdated?: string;
}

export interface NDCSearchResponse {
  results: NDCSearchResult[];
  count: number;
  searchTerm: string;
}

export interface NDCIndexResponse {
  data: NDCSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================
// In-Memory Cache for Server-Side Caching
// ============================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class NDCServerCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes TTL
  private readonly MAX_SIZE = 5000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    if (this.cache.size >= this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  generateKey(searchTerm: string): string {
    return `ndc:${searchTerm.replace(/-/g, '').toLowerCase()}`;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number } {
    return { size: this.cache.size };
  }
}

const serverCache = new NDCServerCache();

// ============================================================
// Service Functions
// ============================================================

/**
 * Fast NDC search using pre-computed pricing index
 * Uses RPC function for optimized database query
 */
export const searchNDC = async (
  searchTerm: string,
  limit: number = 50
): Promise<NDCSearchResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Validate search term
  if (!searchTerm || searchTerm.trim().length < 2) {
    return {
      results: [],
      count: 0,
      searchTerm: searchTerm || ''
    };
  }

  const trimmedSearch = searchTerm.trim();
  
  // Check server cache first
  const cacheKey = serverCache.generateKey(trimmedSearch);
  const cachedResult = serverCache.get<NDCSearchResponse>(cacheKey);
  if (cachedResult) {
    console.log(`📦 NDC Search cache HIT for: ${trimmedSearch}`);
    return cachedResult;
  }

  console.log(`🔍 NDC Search executing RPC for: ${trimmedSearch}`);
  
  // Call optimized RPC function
  const { data, error } = await supabaseAdmin.rpc('search_ndc_pricing_fixed', {
    p_search: trimmedSearch,
    p_limit: limit
  });

  if (error) {
    console.error('❌ NDC Search RPC error:', error);
    throw new AppError(`NDC search failed: ${error.message}`, 500);
  }

  const result: NDCSearchResponse = {
    results: data?.results || [],
    count: data?.count || 0,
    searchTerm: data?.searchTerm || trimmedSearch
  };

  // Cache the result
  serverCache.set(cacheKey, result);

  return result;
};

/**
 * Get full NDC pricing index for client-side caching
 * Supports pagination and incremental sync
 */
export const getNDCIndex = async (
  limit: number = 10000,
  offset: number = 0,
  updatedAfter?: Date
): Promise<NDCIndexResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`📦 Fetching NDC index: limit=${limit}, offset=${offset}`);

  // Call RPC function
  const { data, error } = await supabaseAdmin.rpc('get_ndc_pricing_index', {
    p_limit: limit,
    p_offset: offset,
    p_updated_after: updatedAfter?.toISOString() || null
  });

  if (error) {
    console.error('❌ NDC Index RPC error:', error);
    throw new AppError(`Failed to fetch NDC index: ${error.message}`, 500);
  }

  return {
    data: data?.data || [],
    total: data?.total || 0,
    limit: data?.limit || limit,
    offset: data?.offset || offset
  };
};

/**
 * Get cache statistics (for monitoring)
 */
export const getCacheStats = () => {
  return serverCache.getStats();
};

/**
 * Clear server cache (for admin use)
 */
export const clearCache = () => {
  serverCache.clear();
  return { message: 'Cache cleared successfully' };
};

