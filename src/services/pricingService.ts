/**
 * Shared Pricing Service
 * 
 * This service contains the core pricing logic used by both:
 * - optimizationService (for /api/optimization/recommendations)
 * - inventoryAnalysisService (for /api/inventory-analysis/upload)
 * 
 * Single source of truth for pricing calculations.
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

export interface DistributorPricing {
  distributorId?: string;
  distributorName: string;
  fullPrice: number;
  partialPrice: number;
  email?: string;
  phone?: string;
  location?: string;
  reportDate?: string;
}

export interface NDCPricingResult {
  ndc: string;
  ndcNormalized: string;
  productName: string;
  distributors: DistributorPricing[];
  bestFullPrice: number;
  bestPartialPrice: number;
  totalFullQuantity: number;
  totalPartialQuantity: number;
  recommendedDistributor?: DistributorPricing;
}

export interface PricingRequest {
  ndc: string;
  fullCount?: number;
  partialCount?: number;
}

// ============================================================
// Core Pricing Function
// ============================================================

/**
 * Get pricing for multiple NDCs from return_reports
 * 
 * This is the EXACT SAME logic as used in getOptimizationRecommendations
 * 
 * @param ndcRequests - Array of NDC requests with optional full/partial counts
 * @returns Map of normalized NDC to pricing results
 */
export const getPricingForNDCs = async (
  ndcRequests: PricingRequest[]
): Promise<Map<string, NDCPricingResult>> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;
  const results = new Map<string, NDCPricingResult>();

  // Normalize all NDCs
  const normalizedNDCs = new Set(ndcRequests.map(r => r.ndc.replace(/-/g, '')));
  
  console.log(`📊 getPricingForNDCs: Fetching prices for ${normalizedNDCs.size} NDCs`);
  console.log(`   NDCs:`, [...normalizedNDCs]);

  // Fetch return_reports with the EXACT SAME structure as optimization service
  const selectFields = `
    id,
    data,
    document_id,
    created_at,
    uploaded_documents (
      reverse_distributor_id,
      report_date,
      uploaded_at,
      reverse_distributors (
        id,
        name,
        contact_email,
        contact_phone,
        address
      )
    )
  `;

  // Fetch all return reports using pagination
  const returnReports: any[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: batchError } = await db
      .from('return_reports')
      .select(selectFields)
      .range(offset, offset + batchSize - 1);

    if (batchError) {
      console.error('Error fetching return reports:', batchError);
      throw new AppError(`Failed to fetch pricing data: ${batchError.message}`, 500);
    }

    if (batch && batch.length > 0) {
      returnReports.push(...batch);
      offset += batchSize;
      if (batch.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Fetched ${returnReports.length} return reports`);

  // Sort by report_date (latest first) - Priority: report_date > uploaded_at > created_at
  returnReports.sort((a: any, b: any) => {
    const dateA = a.uploaded_documents?.report_date || a.uploaded_documents?.uploaded_at || a.created_at;
    const dateB = b.uploaded_documents?.report_date || b.uploaded_documents?.uploaded_at || b.created_at;
    const dateAObj = dateA ? new Date(dateA) : new Date(0);
    const dateBObj = dateB ? new Date(dateB) : new Date(0);
    return dateBObj.getTime() - dateAObj.getTime();
  });

  // Maps to track FULL and PARTIAL prices separately per distributor-NDC combination
  // Key format: "distributorName|ndc"
  const distributorNdcToFullPriceMap: Record<string, number> = {};
  const distributorNdcToPartialPriceMap: Record<string, number> = {};
  const distributorNdcToReportDate: Record<string, string> = {};

  // Track total full/partial quantities per NDC across all reports
  const ndcToTotalFullQty: Record<string, number> = {};
  const ndcToTotalPartialQty: Record<string, number> = {};
  
  // Store distributor info
  const distributorInfo: Record<string, { id: string; email?: string; phone?: string; location?: string }> = {};

  // Track product names for each NDC
  const ndcToProductName: Record<string, string> = {};

  // Process each return report
  for (const report of returnReports) {
    const data = report.data;
    if (!data || typeof data !== 'object') continue;

    const distributorName = report.uploaded_documents?.reverse_distributors?.name?.trim();
    if (!distributorName) continue;

    // Store distributor info (using correct column names from reverse_distributors table)
    if (!distributorInfo[distributorName]) {
      distributorInfo[distributorName] = {
        id: report.uploaded_documents?.reverse_distributors?.id,
        email: report.uploaded_documents?.reverse_distributors?.contact_email,
        phone: report.uploaded_documents?.reverse_distributors?.contact_phone,
        location: report.uploaded_documents?.reverse_distributors?.address,
      };
    }

    const reportDate = report.uploaded_documents?.report_date || report.created_at;

    // Handle different data structures - EXACT SAME as optimization service
    let items: any[] = [];
    
    if (Array.isArray(data.items)) {
      items = data.items;
    } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
      items = [data.items];
    } else if (data.ndcCode || data.ndc) {
      // Data itself is an item (MOST COMMON format!)
      items = [data];
    }

    for (const item of items) {
      const ndcCode = item.ndcCode || item.ndc;
      if (!ndcCode) continue;

      const normalizedNdcCode = String(ndcCode).replace(/-/g, '').trim();
      
      // Only process if this NDC is in our search list
      if (!normalizedNDCs.has(normalizedNdcCode)) continue;

      // Track product name (use first one found)
      if (!ndcToProductName[normalizedNdcCode]) {
        const productName = item.itemName || item.productName || item.product_name || item.description;
        if (productName) {
          ndcToProductName[normalizedNdcCode] = String(productName).trim();
        }
      }

      // Get full and partial from item data
      const itemFull = Number(item.full) || 0;
      const itemPartial = Number(item.partial) || 0;

      // Accumulate total quantities per NDC across all reports
      if (!ndcToTotalFullQty[normalizedNdcCode]) ndcToTotalFullQty[normalizedNdcCode] = 0;
      if (!ndcToTotalPartialQty[normalizedNdcCode]) ndcToTotalPartialQty[normalizedNdcCode] = 0;
      ndcToTotalFullQty[normalizedNdcCode] += itemFull;
      ndcToTotalPartialQty[normalizedNdcCode] += itemPartial;

      // Calculate price per unit
      const quantity = Number(item.quantity) || 1;
      const creditAmount = Number(item.creditAmount) || 0;
      const pricePerUnit = Number(item.pricePerUnit) || (quantity > 0 && creditAmount > 0 ? creditAmount / quantity : 0);

      if (pricePerUnit <= 0) continue;

      const distributorNdcKey = `${distributorName}|${normalizedNdcCode}`;

      // Track FULL and PARTIAL prices separately
      // CRITICAL: A record is for FULL if full > 0 AND partial = 0
      // CRITICAL: A record is for PARTIAL if partial > 0 AND full = 0
      const isFullRecord = itemFull > 0 && itemPartial === 0;
      const isPartialRecord = itemPartial > 0 && itemFull === 0;

      // Since we sorted by report_date desc, first match is the latest price
      if (isFullRecord && distributorNdcToFullPriceMap[distributorNdcKey] === undefined) {
        distributorNdcToFullPriceMap[distributorNdcKey] = pricePerUnit;
      }

      if (isPartialRecord && distributorNdcToPartialPriceMap[distributorNdcKey] === undefined) {
        distributorNdcToPartialPriceMap[distributorNdcKey] = pricePerUnit;
      }

      // Track report date
      if (!distributorNdcToReportDate[distributorNdcKey]) {
        distributorNdcToReportDate[distributorNdcKey] = reportDate;
      }
    }
  }

  // Build final results - group by NDC
  for (const normalizedNdc of normalizedNDCs) {
    const distributors: DistributorPricing[] = [];
    const seenDistributors = new Set<string>();

    // Find all distributors that have prices for this NDC
    for (const key of Object.keys(distributorNdcToFullPriceMap)) {
      if (key.endsWith(`|${normalizedNdc}`)) {
        seenDistributors.add(key.split('|')[0]);
      }
    }
    for (const key of Object.keys(distributorNdcToPartialPriceMap)) {
      if (key.endsWith(`|${normalizedNdc}`)) {
        seenDistributors.add(key.split('|')[0]);
      }
    }

    let bestFullPrice = 0;
    let bestPartialPrice = 0;

    // Build pricing entry for each distributor
    for (const distributorName of seenDistributors) {
      const distributorNdcKey = `${distributorName}|${normalizedNdc}`;
      const fullPrice = distributorNdcToFullPriceMap[distributorNdcKey] || 0;
      const partialPrice = distributorNdcToPartialPriceMap[distributorNdcKey] || 0;
      const reportDate = distributorNdcToReportDate[distributorNdcKey];
      const info = distributorInfo[distributorName] || {};

      if (fullPrice > 0 || partialPrice > 0) {
        distributors.push({
          distributorId: info.id,
          distributorName,
          fullPrice,
          partialPrice,
          email: info.email,
          phone: info.phone,
          location: info.location,
          reportDate,
        });

        if (fullPrice > bestFullPrice) bestFullPrice = fullPrice;
        if (partialPrice > bestPartialPrice) bestPartialPrice = partialPrice;
      }
    }

    // Sort by best return value (highest first)
    distributors.sort((a, b) => {
      const aPrice = Math.max(a.fullPrice || 0, a.partialPrice || 0);
      const bPrice = Math.max(b.fullPrice || 0, b.partialPrice || 0);
      return bPrice - aPrice;
    });

    // Find original NDC format from request
    const originalNdc = ndcRequests.find(r => r.ndc.replace(/-/g, '') === normalizedNdc)?.ndc || normalizedNdc;

    results.set(normalizedNdc, {
      ndc: originalNdc,
      ndcNormalized: normalizedNdc,
      productName: ndcToProductName[normalizedNdc] || `Product ${originalNdc}`,
      distributors,
      bestFullPrice,
      bestPartialPrice,
      totalFullQuantity: ndcToTotalFullQty[normalizedNdc] || 0,
      totalPartialQuantity: ndcToTotalPartialQty[normalizedNdc] || 0,
      recommendedDistributor: distributors[0], // Best one
    });
  }

  console.log(`📊 Found pricing for ${results.size} NDCs`);

  return results;
};

/**
 * Get pricing for a single NDC (convenience function)
 */
export const getPricingForSingleNDC = async (
  ndc: string,
  fullCount?: number,
  partialCount?: number
): Promise<NDCPricingResult | null> => {
  const results = await getPricingForNDCs([{ ndc, fullCount, partialCount }]);
  const normalizedNdc = ndc.replace(/-/g, '');
  return results.get(normalizedNdc) || null;
};

