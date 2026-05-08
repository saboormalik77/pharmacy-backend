import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

export interface OptimizationRecommendation {
  id?: string;
  ndc: string;
  productName: string;
  quantity: number;
  full?: number; // Full units from return reports
  partial?: number; // Partial units from return reports
  lotNumber?: string;
  expirationDate?: string;
  recommendedDistributor: string;
  recommendedDistributorId?: string; // Distributor UUID
  recommendedDistributorContact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  expectedPrice: number;
  worstPrice: number;
  fullPricePerUnit?: number; // Price per unit for full units (search mode only)
  partialPricePerUnit?: number; // Price per unit for partial units (search mode only)
  available?: boolean;
  alternativeDistributors: Array<{
    id?: string; // Distributor UUID
    name: string;
    price: number;
    fullPrice?: number; // Price for full units from this distributor
    partialPrice?: number; // Price for partial units from this distributor
    difference: number;
    available?: boolean;
    email?: string;
    phone?: string;
    location?: string;
  }>;
  savings: number;
  _distributorAverages?: Array<{ name: string; price: number; fullPrice?: number; partialPrice?: number }>; // Temporary storage for availability check
}

export interface OptimizationResponse {
  recommendations: OptimizationRecommendation[];
  totalPotentialSavings: number;
  generatedAt: string;
  distributorUsage: {
    usedThisMonth: number;
    totalDistributors: number;
    stillAvailable: number;
  };
  earningsComparison: {
    singleDistributorStrategy: number;
    multipleDistributorsStrategy: number;
    potentialAdditionalEarnings: number;
  };
}

// Get optimization recommendations for pharmacy products
export const getOptimizationRecommendations = async (
  pharmacyId: string,
  searchNdcs?: string[],
  fullCounts?: number[],
  partialCounts?: number[]
): Promise<OptimizationResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  let ndcs: string[] = [];
  let productItems: Array<{ id: string; ndc: string; product_name: string; quantity: number; full_units?: number; partial_units?: number; lot_number?: string; expiration_date?: string }> = [];
  const isSearchMode = searchNdcs && searchNdcs.length > 0;

  // Create a map of NDC to unit type requirement (for filtering return_reports)
  // Key: normalized NDC (without dashes), Value: { requiresFull: boolean, requiresPartial: boolean }
  const ndcUnitTypeMap: Map<string, { requiresFull: boolean; requiresPartial: boolean }> = new Map();

  // If NDC search parameter is provided, use those NDCs for partial matching
  if (isSearchMode) {
    // Use the provided NDCs for search (these are search terms, may be partial)
    const searchTerms = [...new Set(searchNdcs.map(n => String(n).replace(/-/g, '').trim()))];
    console.log(`🔍 Using search NDCs (search mode - will fetch productName and quantity from return_reports):`, searchTerms);
    
    // Store search terms for later matching
    ndcs = searchTerms;
    
    // Build unit type map for each NDC
    if (fullCounts || partialCounts) {
      searchNdcs.forEach((originalNdc, index) => {
        const normalizedNdc = String(originalNdc).replace(/-/g, '').trim();
        const requiresFull = !!(fullCounts && fullCounts[index] !== undefined && fullCounts[index] !== null && fullCounts[index] > 0);
        const requiresPartial = !!(partialCounts && partialCounts[index] !== undefined && partialCounts[index] !== null && partialCounts[index] > 0);
        
        ndcUnitTypeMap.set(normalizedNdc, { requiresFull, requiresPartial });
        console.log(`📋 NDC ${originalNdc} (normalized: ${normalizedNdc}): requiresFull=${requiresFull}, requiresPartial=${requiresPartial}`);
      });
    }
    
    // In search mode, we don't fetch from product_list_items
    // productName and quantity will be extracted from return_reports during processing
    // Initialize empty productItems - will be populated from return_reports later
    productItems = [];
    console.log(`📋 Search mode: Skipping pharmacy inventory, will use return_reports data only`);
  } else {
    // Step 1: Get all product list items for this pharmacy (including full_units and partial_units)
    // Use pagination to fetch ALL records (Supabase default limit is 1000)
    console.log(`📦 Fetching ALL product_list_items for pharmacy ${pharmacyId} using pagination...`);
    const allItems: any[] = [];
    const itemsBatchSize = 1000;
    let itemsOffset = 0;
    let hasMoreItems = true;

    while (hasMoreItems) {
      const { data: itemsBatch, error: itemsError } = await db
        .from('product_list_items')
        .select('id, ndc, product_name, full_units, partial_units, lot_number, expiration_date')
        .eq('added_by', pharmacyId)
        .range(itemsOffset, itemsOffset + itemsBatchSize - 1);

      if (itemsError) {
        throw new AppError(`Failed to fetch product list items: ${itemsError.message}`, 400);
      }

      if (itemsBatch && itemsBatch.length > 0) {
        allItems.push(...itemsBatch);
        itemsOffset += itemsBatchSize;
        console.log(`   ✅ Fetched ${allItems.length} product_list_items so far...`);
        
        // If we got fewer records than batch size, we've reached the end
        if (itemsBatch.length < itemsBatchSize) {
          hasMoreItems = false;
        }
      } else {
        hasMoreItems = false;
      }
    }

    console.log(`📦 Total product_list_items fetched: ${allItems.length}`);
    const items = allItems;

    if (!items || items.length === 0) {
      // Get total active distributors for empty response
      const { data: allActiveDistributors } = await db
        .from('reverse_distributors')
        .select('id')
        .eq('is_active', true);
      
      const totalDistributors = allActiveDistributors?.length || 0;
      
      return {
        recommendations: [],
        totalPotentialSavings: 0,
        generatedAt: new Date().toISOString(),
        distributorUsage: {
          usedThisMonth: 0,
          totalDistributors,
          stillAvailable: totalDistributors,
        },
        earningsComparison: {
          singleDistributorStrategy: 0,
          multipleDistributorsStrategy: 0,
          potentialAdditionalEarnings: 0,
        },
      };
    }

    // Map items to include quantity (sum of full_units and partial_units) and unit fields
    productItems = items.map((item: any) => ({
      id: item.id,
      ndc: item.ndc,
      product_name: item.product_name,
      quantity: (Number(item.full_units) || 0) + (Number(item.partial_units) || 0), // Sum for quantity
      full_units: Number(item.full_units) || 0,
      partial_units: Number(item.partial_units) || 0,
      lot_number: item.lot_number,
      expiration_date: item.expiration_date,
    }));
    
    // Step 2: Extract unique NDCs from current pharmacy's product_list_items only
    // IMPORTANT: Only NDCs from this pharmacy's inventory will be processed
    ndcs = [...new Set(productItems.map((item) => item.ndc))];
    
    // Build unit type map for each NDC based on inventory
    // If full_units > 0, we need to fetch return_reports with full > 0 (for full prices)
    // If partial_units > 0, we need to fetch return_reports with partial > 0 (for partial prices)
    // IMPORTANT: When same NDC has both full and partial items, MERGE requirements (OR logic)
    // This ensures we fetch return_reports for BOTH unit types when needed
    productItems.forEach((inventoryItem) => {
      const normalizedNdc = String(inventoryItem.ndc).replace(/-/g, '').trim();
      const fullUnits = inventoryItem.full_units || 0;
      const partialUnits = inventoryItem.partial_units || 0;
      
      // Simple logic: if item has full units, we need full price records
      // If item has partial units, we need partial price records
      const itemNeedsFull = fullUnits > 0;
      const itemNeedsPartial = partialUnits > 0;
      
      // Only set if we have a requirement
      if (itemNeedsFull || itemNeedsPartial) {
        // Check if we already have requirements for this NDC - MERGE with OR logic
        const existing = ndcUnitTypeMap.get(normalizedNdc);
        if (existing) {
          // Merge: if ANY item needs full OR partial, set that flag to true
          const mergedRequiresFull = existing.requiresFull || itemNeedsFull;
          const mergedRequiresPartial = existing.requiresPartial || itemNeedsPartial;
          ndcUnitTypeMap.set(normalizedNdc, { requiresFull: mergedRequiresFull, requiresPartial: mergedRequiresPartial });
          console.log(`📋 Inventory NDC ${inventoryItem.ndc} (normalized: ${normalizedNdc}): full_units=${fullUnits}, partial_units=${partialUnits} → MERGED requiresFull=${mergedRequiresFull}, requiresPartial=${mergedRequiresPartial}`);
        } else {
          ndcUnitTypeMap.set(normalizedNdc, { requiresFull: itemNeedsFull, requiresPartial: itemNeedsPartial });
          console.log(`📋 Inventory NDC ${inventoryItem.ndc} (normalized: ${normalizedNdc}): full_units=${fullUnits}, partial_units=${partialUnits} → requiresFull=${itemNeedsFull}, requiresPartial=${itemNeedsPartial}`);
        }
      }
    });
  }

  // Step 3: Search return_reports for matching NDCs
  // Join with uploaded_documents and reverse_distributors to get distributor name
  // Note: We create a fresh query for each batch to avoid query reuse issues
  const selectFields = `
    id,
    data,
    document_id,
    created_at,
    pharmacy_id,
    uploaded_documents (
      reverse_distributor_id,
      report_date,
      uploaded_at,
      reverse_distributors (
        id,
        name
      )
    )
  `;

  // IMPORTANT: Do NOT filter return_reports by pharmacy_id for pricing data
  // We want to show prices from ALL distributors across ALL return reports
  // The pharmacy's inventory comes from product_list_items (filtered by added_by = pharmacyId)
  // But pricing data should include all distributors to find the best prices
  console.log(`🏥 Fetching return_reports from ALL distributors (no pharmacy_id filter for pricing)`);
  console.log(`   Pharmacy inventory NDCs will be matched against all available distributor prices`);

  // Build filter conditions for search mode
  let orConditions: string[] = [];
  if (isSearchMode && searchNdcs && searchNdcs.length > 0) {
    // Build OR conditions for each search NDC
    // Match both with dashes and without dashes using ilike for partial matching
    searchNdcs.forEach(searchNdc => {
      const normalized = String(searchNdc).replace(/-/g, '').trim();
      const withDashes = String(searchNdc).trim();
      
      // Helper function to format NDC with dashes (5-4-2 format, most common)
      const formatNdcWithDashes = (ndc: string): string => {
        const clean = ndc.replace(/-/g, '');
        if (clean.length === 11) {
          return `${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
        }
        return ndc;
      };
      
      // Generate dashed version if the input is without dashes
      const dashedFormat = formatNdcWithDashes(normalized);
      
      // Use ilike for partial matching (like SQL LIKE '%pattern%')
      // For JSONB fields, use the correct PostgREST syntax
      // This will match: "00456-0460-01", "00456046001", "00456-0460-01-extra", etc.
      orConditions.push(`data->>ndcCode.ilike.%${withDashes}%`);
      if (normalized !== withDashes) {
        orConditions.push(`data->>ndcCode.ilike.%${normalized}%`);
      }
      // Also search for the dashed format
      if (dashedFormat !== withDashes && dashedFormat !== normalized) {
        orConditions.push(`data->>ndcCode.ilike.%${dashedFormat}%`);
      }
      
      // Also try matching 'ndc' field if it exists
      orConditions.push(`data->>ndc.ilike.%${withDashes}%`);
      if (normalized !== withDashes) {
        orConditions.push(`data->>ndc.ilike.%${normalized}%`);
      }
      // Also search for the dashed format in 'ndc' field
      if (dashedFormat !== withDashes && dashedFormat !== normalized) {
        orConditions.push(`data->>ndc.ilike.%${dashedFormat}%`);
      }
    });
    
    if (orConditions.length > 0) {
      console.log(`🔍 Filtering return_reports by NDC at database level (partial match)`);
      console.log(`   Search NDCs:`, searchNdcs);
      console.log(`   OR conditions:`, orConditions);
    }
  }

  // Fetch ALL records using pagination (Supabase default limit is 1000)
  // Fetch in batches of 1000 until we get all records
  // IMPORTANT: Create a fresh query for each batch to avoid query builder reuse issues
  console.log(`📊 Fetching ALL return_reports using pagination...`);
  const returnReports: any[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Create a FRESH query for each batch (Supabase query builders can have state issues when reused)
    let batchQuery = db
      .from('return_reports')
      .select(selectFields)
      .range(offset, offset + batchSize - 1);
    
    // Apply OR conditions if any (for search mode)
    if (orConditions.length > 0) {
      batchQuery = batchQuery.or(orConditions.join(','));
    }
    
    const { data: batch, error: batchError } = await batchQuery;

    if (batchError) {
      throw new AppError(`Failed to fetch return reports: ${batchError.message}`, 400);
    }

    if (batch && batch.length > 0) {
      returnReports.push(...batch);
      offset += batchSize;
      console.log(`   ✅ Fetched ${returnReports.length} records so far...`);
      
      // If we got fewer records than batch size, we've reached the end
      if (batch.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Total return_reports fetched: ${returnReports.length}`);

  // Sort by report_date (latest first) for determining latest prices
  // Apply to all modes - always use latest price based on report_date
  // Priority: report_date > uploaded_at > created_at
  if (returnReports) {
    returnReports.sort((a: any, b: any) => {
      // Primary: use report_date from uploaded_documents (the actual report date from PDF)
      const dateA = a.uploaded_documents?.report_date || a.uploaded_documents?.uploaded_at || a.created_at;
      const dateB = b.uploaded_documents?.report_date || b.uploaded_documents?.uploaded_at || b.created_at;
      
      // Convert to Date objects for comparison
      const dateAObj = dateA ? new Date(dateA) : new Date(0);
      const dateBObj = dateB ? new Date(dateB) : new Date(0);
      
      // Sort descending (latest report_date first)
      return dateBObj.getTime() - dateAObj.getTime();
    });
    console.log(`📅 Sorted ${returnReports.length} return reports by report_date (latest first)`);
  }

  // Pre-create normalized NDC lookup for faster matching in non-search mode
  // IMPORTANT: Only NDCs from current pharmacy's product_list_items are included
  const normalizedNdcLookup = new Map<string, string>();
  if (!isSearchMode) {
    ndcs.forEach(ndc => {
      const normalized = String(ndc).replace(/-/g, '').trim();
      normalizedNdcLookup.set(normalized, ndc);
    });
  }

  console.log(`📦 Found ${returnReports?.length || 0} return report records`);
  if (isSearchMode) {
    console.log(`🔍 Database query filtered by NDC - should only return matching records`);
  }
  console.log(`🔍 Looking for NDCs:`, ndcs);
  if (isSearchMode && searchNdcs) {
    console.log(`🔍 Original search NDCs (from query param):`, searchNdcs);
    console.log(`🔍 Normalized search NDCs (for matching):`, ndcs);
  }
  
  // Debug: Check what distributors we have in the data
  const allDistributors = new Set<string>();
  (returnReports || []).forEach((report: any) => {
    // Get distributor name from joined reverse_distributors table, fallback to data field, then Unknown
    const distributorName = report.uploaded_documents?.reverse_distributors?.name || 
                           report.data?.reverseDistributor || 
                           report.data?.reverseDistributorInfo?.name ||
                           'Unknown Distributor';
    if (distributorName && distributorName !== 'Unknown Distributor') {
      allDistributors.add(distributorName);
    }
  });
  console.log(`🏢 All distributors in data:`, Array.from(allDistributors));

  // Step 4: Process the data - match NDCs and group by distributor
  const ndcPricingMap: Record<
    string,
    Array<{
      distributorName: string;
      pricePerUnit: number;
      creditAmount: number;
      quantity: number;
    }>
  > = {};

  // Map to track which search term matched which actual NDC (for search mode)
  const searchTermToActualNdc: Record<string, string> = {};
  
  // Map to track product names from return_reports (for NDCs not in pharmacy inventory)
  const ndcToProductNameMap: Record<string, string> = {};
  
  // Map to track quantities from return_reports (for search mode - always use from return_reports)
  const ndcToQuantityMap: Record<string, number> = {};
  
  // Map to track full units from return_reports
  const ndcToFullMap: Record<string, number> = {};
  
  // Map to track partial units from return_reports
  const ndcToPartialMap: Record<string, number> = {};
  
  // Map to track latest price per NDC from return_reports (for search mode - use latest not average)
  const ndcToLatestPriceMap: Record<string, number> = {};
  
  // Map to track latest price per distributor-NDC combination (for alternatives in search mode)
  const distributorNdcToLatestPriceMap: Record<string, number> = {}; // Key format: "distributorName|ndc"
  
  // Maps to track full and partial prices separately per distributor-NDC combination (for search mode)
  // Key format: "distributorName|ndc", Value: price per unit
  const distributorNdcToFullPriceMap: Record<string, number> = {};
  const distributorNdcToPartialPriceMap: Record<string, number> = {};

  // Initialize map for all NDCs
  ndcs.forEach((ndc) => {
    ndcPricingMap[ndc] = [];
  });

  // Process return reports
  // Each return_reports record contains a single item in the data field
  if (isSearchMode) {
    console.log(`\n=== PROCESSING RETURN REPORTS FOR SEARCH MODE ===`);
    console.log(`📊 Total return reports to process: ${returnReports?.length || 0}`);
  } else {
    console.log(`\n=== PROCESSING RETURN REPORTS FOR NON-SEARCH MODE ===`);
    console.log(`📊 Total return reports to scan: ${returnReports?.length || 0}`);
    console.log(`🔍 Pharmacy inventory NDCs to match:`, ndcs);
  }
  (returnReports || []).forEach((report: any) => {
    const data = report.data;
    
    if (isSearchMode) {
      console.log(`\n📄 Processing report ${report.id}`);
      console.log(`   Data keys:`, data ? Object.keys(data) : 'null');
      console.log(`   Data.ndcCode:`, data?.ndcCode);
      console.log(`   Data.ndc:`, data?.ndc);
      console.log(`   Full data:`, JSON.stringify(data, null, 2).substring(0, 500));
    }
    
    // Get distributor name from joined reverse_distributors table, fallback to data field, then Unknown
    // Normalize by trimming to ensure consistent matching
    const distributorName = (report.uploaded_documents?.reverse_distributors?.name || 
                           data?.reverseDistributor || 
                           data?.reverseDistributorInfo?.name ||
                           'Unknown Distributor').trim();
    
    // Debug: Log distributor extraction
    console.log(`🔍 Report ${report.id}: distributor = "${distributorName}"`);
    
    // Ensure we have a valid distributor name
    if (!distributorName || distributorName === 'Unknown Distributor') {
      console.warn('⚠️ No distributor name found for return report:', report.id, 'data keys:', Object.keys(data || {}));
    }

    // Handle different data structures:
    // 1. If data has items array, use that (legacy format)
    // 2. If data itself is an item (current format - each record is one item), use it directly
    let items: any[] = [];
    
    if (data && typeof data === 'object') {
      if (Array.isArray(data.items)) {
        // Legacy format with items array
        items = data.items;
        if (isSearchMode) {
          console.log(`   📋 Found items array with ${items.length} items`);
        }
      } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        // Single item object in items field
        items = [data.items];
        if (isSearchMode) {
          console.log(`   📋 Found single item object in items field`);
        }
      } else if (data.ndcCode || data.ndc) {
        // Data itself is an item (current format - most common)
        items = [data];
        if (isSearchMode) {
          console.log(`   📋 Data itself is an item (has ndcCode or ndc)`);
        }
      } else {
        if (isSearchMode) {
          console.log(`   ⚠️ Could not extract items from data structure. Data type: ${typeof data}, keys: ${data ? Object.keys(data).join(', ') : 'null'}`);
        }
      }
    } else {
      if (isSearchMode) {
        console.log(`   ⚠️ Data is not an object or is null`);
      }
    }
    
    if (isSearchMode) {
      console.log(`   📦 Extracted ${items.length} items from report ${report.id}`);
    }

    items.forEach((item: any, itemIndex: number) => {
      // Try different possible field names for NDC
      const ndcCode = item.ndcCode || item.ndc;
      
      if (!ndcCode) {
        if (isSearchMode) {
          console.log(`   ⚠️ No NDC found in item ${itemIndex + 1}. Item keys:`, Object.keys(item || {}));
        }
        return;
      }

      // Normalize NDC for comparison (remove dashes and convert to string)
      const normalizedNdcCode = String(ndcCode).replace(/-/g, '').trim();
      
      // Get full and partial from item data (return_reports uses "full" and "partial" fields)
      const itemFull = Number(item.full) || 0;
      const itemPartial = Number(item.partial) || 0;
      
      // In search mode, do NOT filter by unit type - we want to collect ALL records
      // to show both full and partial prices in the response
      if (!isSearchMode && ndcUnitTypeMap.size > 0) {
        // Non-search mode: Apply unit type filtering based on inventory
        
        // Find which NDC this item matches and get its unit type requirement
        let unitTypeRequirement: { requiresFull: boolean; requiresPartial: boolean } | undefined;
        
        // Check if this normalized NDC matches any inventory NDC
        for (const [normalizedInventoryNdc, requirement] of ndcUnitTypeMap.entries()) {
          if (normalizedNdcCode === normalizedInventoryNdc) {
            unitTypeRequirement = requirement;
            break;
          }
        }
        
        // If we have a requirement for this NDC, apply the filter
        if (unitTypeRequirement) {
          const { requiresFull, requiresPartial } = unitTypeRequirement;
          
          // A full-only record: full > 0 AND partial = 0
          const isFullOnlyRecord = itemFull > 0 && itemPartial === 0;
          // A partial-only record: partial > 0 AND full = 0
          const isPartialOnlyRecord = itemPartial > 0 && itemFull === 0;
          
          // When BOTH requiresFull and requiresPartial are true (same NDC has items with both unit types),
          // accept records that match EITHER requirement (OR logic)
          if (requiresFull && requiresPartial) {
            // Accept if it's a valid full-only OR partial-only record
            if (!isFullOnlyRecord && !isPartialOnlyRecord) {
              console.log(`   ⏭️ Skipping item - Mixed requirement for NDC ${ndcCode}: full=${itemFull}, partial=${itemPartial} (need either full-only or partial-only record)`);
              return;
            }
            console.log(`   ✅ Item passed unit filter (BOTH types needed) for NDC ${ndcCode}: full=${itemFull}, partial=${itemPartial}, isFullOnly=${isFullOnlyRecord}, isPartialOnly=${isPartialOnlyRecord}`);
          } else if (requiresFull) {
            // Only full is required - match full-only records
            if (!isFullOnlyRecord) {
              console.log(`   ⏭️ Skipping item - FullCount filter for NDC ${ndcCode}: full=${itemFull}, partial=${itemPartial} (need full > 0 and partial = 0)`);
              return;
            }
            console.log(`   ✅ Item passed unit filter (Full required) for NDC ${ndcCode}: full=${itemFull}, partial=${itemPartial}`);
          } else if (requiresPartial) {
            // Only partial is required - match partial-only records
            if (!isPartialOnlyRecord) {
              console.log(`   ⏭️ Skipping item - PartialCount filter for NDC ${ndcCode}: full=${itemFull}, partial=${itemPartial} (need partial > 0 and full = 0)`);
              return;
            }
            console.log(`   ✅ Item passed unit filter (Partial required) for NDC ${ndcCode}: full=${itemFull}, partial=${itemPartial}`);
          }
        }
      }
      
      if (isSearchMode) {
        console.log(`   📦 Processing item ${itemIndex + 1}/${items.length}`);
        console.log(`   Item keys:`, Object.keys(item || {}));
        console.log(`   Item.ndcCode:`, item.ndcCode);
        console.log(`   Item.ndc:`, item.ndc);
        console.log(`   🔍 Checking NDC: "${ndcCode}" (normalized: "${normalizedNdcCode}") against search terms:`, ndcs);
      }
      
      // Find matching NDC from product list or search terms
      let matchingNdc: string | undefined;
      let actualNdcKey: string; // The key to use in ndcPricingMap
      
      if (isSearchMode) {
        // Exact match mode: check if normalized NDC exactly matches any search term
        // In search mode, ndcs array already contains normalized search terms (from line 71)
        const matchedSearchTerm = ndcs.find(searchTerm => {
          // searchTerm is already normalized (no dashes) from line 67-71
          const normalizedSearchTerm = String(searchTerm).replace(/-/g, '').trim();
          // Use exact match for better accuracy when user provides specific NDC
          return normalizedNdcCode === normalizedSearchTerm;
        });
        
        if (!matchedSearchTerm) {
          if (isSearchMode) {
            console.log(`❌ NDC "${ndcCode}" (normalized: "${normalizedNdcCode}") did not match any search term`);
          }
          return;
        }
        
        // Use the ORIGINAL NDC format from return_reports (preserve dashes)
        const originalNdcFormat = String(ndcCode).trim();
        actualNdcKey = originalNdcFormat;
        matchingNdc = matchedSearchTerm;
        
        // Track which search term matched which actual NDC (store original format with dashes)
        searchTermToActualNdc[matchedSearchTerm] = originalNdcFormat;
        
        // Extract product name from return_reports data field (try various field names)
        // Priority: itemName (most common in return_reports.data) > productName > product_name > product > description > drugName > name
        if (isSearchMode) {
          console.log(`   🔍 Item object keys:`, Object.keys(item || {}));
          console.log(`   🔍 item.itemName:`, item.itemName);
          console.log(`   🔍 item.productName:`, item.productName);
        }
        
        const productName = item.itemName || item.productName || item.product_name || item.product || item.description || item.drugName || item.name;
        if (productName && !ndcToProductNameMap[originalNdcFormat]) {
          const fieldName = item.itemName ? 'itemName' : item.productName ? 'productName' : item.product_name ? 'product_name' : 'other';
          ndcToProductNameMap[originalNdcFormat] = String(productName).trim();
          console.log(`✅ Matched! Search term "${matchedSearchTerm}" → Actual NDC "${originalNdcFormat}"`);
          console.log(`   📦 Product name from return_reports.data.${fieldName}: "${productName}"`);
        } else if (productName && ndcToProductNameMap[originalNdcFormat]) {
          console.log(`✅ Matched! Search term "${matchedSearchTerm}" → Actual NDC "${originalNdcFormat}" (product name already stored: "${ndcToProductNameMap[originalNdcFormat]}")`);
        } else {
          console.log(`✅ Matched! Search term "${matchedSearchTerm}" → Actual NDC "${originalNdcFormat}"`);
          if (isSearchMode) {
            console.log(`   ⚠️ No product name found. Item keys:`, Object.keys(item || {}));
          }
        }
        
        // Track quantity from return_reports (sum if multiple records for same NDC)
        const itemQuantity = Number(item.quantity) || 1;
        if (isSearchMode) {
          if (!ndcToQuantityMap[originalNdcFormat]) {
            ndcToQuantityMap[originalNdcFormat] = 0;
          }
          ndcToQuantityMap[originalNdcFormat] += itemQuantity;
          console.log(`   📊 Quantity from return_reports: ${itemQuantity} (total so far: ${ndcToQuantityMap[originalNdcFormat]})`);
        }
        
        // Initialize map entry for actual NDC if not exists
        if (!ndcPricingMap[actualNdcKey]) {
          ndcPricingMap[actualNdcKey] = [];
        }
        
        // Track full and partial from return_reports (use latest value, not sum)
        // Store the latest full and partial values (since we sorted by report_date desc, first match is latest)
        const itemFull = Number(item.full) || 0;
        const itemPartial = Number(item.partial) || 0;
        // Always update with latest value (first match is latest due to sorting)
        if (ndcToFullMap[originalNdcFormat] === undefined) {
          ndcToFullMap[originalNdcFormat] = itemFull;
        }
        if (ndcToPartialMap[originalNdcFormat] === undefined) {
          ndcToPartialMap[originalNdcFormat] = itemPartial;
        }
      } else {
        // Non-search mode: The unit type filtering has already been done in the first block (lines 525-574)
        // No need to duplicate the filtering logic here
        
        // Exact match mode: use pre-computed lookup map for O(1) access
        // IMPORTANT: normalizedNdcLookup only contains NDCs from current pharmacy's product_list_items
        matchingNdc = normalizedNdcLookup.get(normalizedNdcCode);
        
        if (!matchingNdc) {
          // Fallback to original matching logic for edge cases
          // IMPORTANT: ndcs array only contains NDCs from current pharmacy's product_list_items
          matchingNdc = ndcs.find(n => {
            return String(n).trim() === String(ndcCode).trim();
          });
        }
        
        // Only process if NDC matches one from current pharmacy's inventory
        if (!matchingNdc) {
          return;
        }
        
        actualNdcKey = matchingNdc;
      }

      const quantity = Number(item.quantity) || 1;
      const creditAmount = Number(item.creditAmount) || 0;
      const pricePerUnit = Number(item.pricePerUnit) || (quantity > 0 && creditAmount > 0 ? creditAmount / quantity : 0);

      // Track full and partial from return_reports (use latest value, not sum)
      // Store the latest full and partial values (since we sorted by report_date desc, first match is latest)
      // Note: itemFull and itemPartial are already extracted at the beginning of this block (line ~477)
      // Always update with latest value (first match is latest due to sorting)
      if (ndcToFullMap[actualNdcKey] === undefined) {
        ndcToFullMap[actualNdcKey] = itemFull;
      }
      if (ndcToPartialMap[actualNdcKey] === undefined) {
        ndcToPartialMap[actualNdcKey] = itemPartial;
      }

      if (pricePerUnit > 0) {
        ndcPricingMap[actualNdcKey].push({
          distributorName,
          pricePerUnit,
          creditAmount,
          quantity,
        });
        
        // Log for both search and non-search modes to track pricing data collection
        console.log(`   ✅ Added to pricing map: NDC=${actualNdcKey}, Distributor="${distributorName}", Price=${pricePerUnit}, Quantity=${quantity}`);
        console.log(`   📊 Total entries in pricing map for ${actualNdcKey}: ${ndcPricingMap[actualNdcKey].length}`);
        
        // Track latest price per NDC based on report_date (apply to all modes)
        // Get report_date (prefer report_date, then uploaded_at, then created_at)
        const reportDate = report.uploaded_documents?.report_date;
        const uploadedAt = report.uploaded_documents?.uploaded_at;
        const createdAt = report.created_at;
        
        // Use report_date if available, otherwise uploaded_at, otherwise created_at
        const timestamp = reportDate || uploadedAt || createdAt;
        const timestampDate = timestamp ? new Date(timestamp) : new Date(0);
        
        // Track latest price per NDC (only update if this is the first/latest record we've seen)
        // Since we sorted by report_date desc, the first matching record is the latest
        if (!ndcToLatestPriceMap[actualNdcKey]) {
          ndcToLatestPriceMap[actualNdcKey] = pricePerUnit;
          if (isSearchMode) {
            console.log(`   💰 Latest price for NDC ${actualNdcKey}: ${pricePerUnit} (report_date: ${reportDate || 'N/A'})`);
          }
        }
        
        // Track latest price per distributor-NDC combination
        const distributorNdcKey = `${distributorName}|${actualNdcKey}`;
        if (!distributorNdcToLatestPriceMap[distributorNdcKey]) {
          distributorNdcToLatestPriceMap[distributorNdcKey] = pricePerUnit;
          if (isSearchMode) {
            console.log(`   💰 Latest price for ${distributorName}|${actualNdcKey}: ${pricePerUnit} (report_date: ${reportDate || 'N/A'})`);
          }
        } else {
          if (isSearchMode) {
            console.log(`   ℹ️ Latest price already set for ${distributorNdcKey}: ${distributorNdcToLatestPriceMap[distributorNdcKey]} (skipping this record)`);
          }
        }
        
        // Track FULL and PARTIAL prices separately per distributor-NDC (for ALL modes)
        // A record is for FULL if full > 0 and partial = 0
        // A record is for PARTIAL if partial > 0 and full = 0
        // This is essential for non-search mode when same NDC has both full and partial inventory items
          const isFullRecord = itemFull > 0 && itemPartial === 0;
          const isPartialRecord = itemPartial > 0 && itemFull === 0;
          
          if (isFullRecord && !distributorNdcToFullPriceMap[distributorNdcKey]) {
            distributorNdcToFullPriceMap[distributorNdcKey] = pricePerUnit;
            console.log(`   💰 FULL price for ${distributorName}|${actualNdcKey}: ${pricePerUnit}`);
          }
          
          if (isPartialRecord && !distributorNdcToPartialPriceMap[distributorNdcKey]) {
            distributorNdcToPartialPriceMap[distributorNdcKey] = pricePerUnit;
            console.log(`   💰 PARTIAL price for ${distributorName}|${actualNdcKey}: ${pricePerUnit}`);
        }
        
        console.log(`✅ Matched NDC ${actualNdcKey} (search term: ${matchingNdc}) with distributor "${distributorName}", price: ${pricePerUnit}, full=${itemFull}, partial=${itemPartial}`);
      } else {
        if (isSearchMode) {
          console.log(`   ❌ Skipped NDC ${actualNdcKey} - invalid price: ${pricePerUnit} (creditAmount: ${creditAmount}, quantity: ${quantity})`);
        } else {
          console.log(`❌ Skipped NDC ${actualNdcKey} - invalid price: ${pricePerUnit}`);
        }
      }
    });
  });

  // Debug: Log pricing map summary
  console.log(`\n=== PRICING MAP SUMMARY ===`);
  Object.entries(ndcPricingMap).forEach(([ndc, pricing]) => {
    if (pricing.length > 0) {
      const uniqueDistributors = [...new Set(pricing.map(p => p.distributorName))];
      console.log(`📊 NDC ${ndc}:`);
      console.log(`   - ${pricing.length} total records`);
      console.log(`   - ${uniqueDistributors.length} unique distributors: [${uniqueDistributors.join(', ')}]`);
      
      // Show detailed breakdown
      const distributorBreakdown: Record<string, number[]> = {};
      pricing.forEach(p => {
        if (!distributorBreakdown[p.distributorName]) {
          distributorBreakdown[p.distributorName] = [];
        }
        distributorBreakdown[p.distributorName].push(p.pricePerUnit);
      });
      
      Object.entries(distributorBreakdown).forEach(([dist, prices]) => {
        console.log(`     * ${dist}: ${prices.length} records, prices: [${prices.join(', ')}]`);
      });
    } else {
      console.log(`📊 NDC ${ndc}: No pricing data found`);
    }
  });
  console.log(`=== END PRICING MAP ===\n`);

  // Step 5: Generate recommendations
  const recommendations: OptimizationRecommendation[] = [];

  // In search mode, update productItems to use actual matched NDCs from return_reports
  if (isSearchMode && Object.keys(searchTermToActualNdc).length > 0) {
    console.log(`\n=== MERGING RETURN REPORTS DATA (SEARCH MODE) ===`);
    console.log(`searchTermToActualNdc map:`, searchTermToActualNdc);
    console.log(`ndcToProductNameMap (from return_reports.data):`, ndcToProductNameMap);
    console.log(`ndcToQuantityMap (from return_reports.data):`, ndcToQuantityMap);
    
    // Create a map of actual NDCs to product info - ALWAYS use return_reports data in search mode
    const actualNdcToProduct: Map<string, { 
      id: string; 
      product_name: string; 
      quantity: number; 
      lot_number?: string; 
      expiration_date?: string;
    }> = new Map();
    
    // For each matched NDC, use productName and quantity from return_reports
    for (const [searchTerm, actualNdc] of Object.entries(searchTermToActualNdc)) {
      console.log(`✨ Processing matched NDC ${actualNdc} from return_reports`);
      
      // Get product name from return_reports (priority: return_reports > products table > default)
      let productName = ndcToProductNameMap[actualNdc];
      console.log(`   🔍 Looking for product name in ndcToProductNameMap for "${actualNdc}":`, productName || 'NOT FOUND');
      
      if (!productName) {
        console.log(`   🔍 Product name not found in return_reports.data, fetching from products table for NDC ${actualNdc}...`);
        const { data: productData } = await db
          .from('products')
          .select('product_name')
          .eq('ndc', actualNdc)
          .limit(1)
          .maybeSingle();
        
        if (productData?.product_name) {
          productName = productData.product_name;
          console.log(`   ✅ Found product name in products table: "${productName}"`);
        } else {
          // Also try with normalized NDC (without dashes)
          const normalizedNdc = String(actualNdc).replace(/-/g, '').trim();
          const { data: productData2 } = await db
            .from('products')
            .select('product_name')
            .eq('ndc', normalizedNdc)
            .limit(1)
            .maybeSingle();
          
          if (productData2?.product_name) {
            productName = productData2.product_name;
            console.log(`   ✅ Found product name in products table (normalized): "${productName}"`);
          } else {
            productName = `Product ${actualNdc}`;
            console.log(`   ⚠️ Product name not found anywhere, using default: "${productName}"`);
          }
        }
      } else {
        console.log(`   ✅ Using product name from return_reports.data: "${productName}"`);
      }
      
      // In search mode, quantity should always be 1 in API response
      const quantity = 1;
      console.log(`   📊 Setting quantity to 1 (search mode requirement)`);
      
      actualNdcToProduct.set(actualNdc, {
        id: '',
        product_name: productName,
        quantity: quantity, // Always 1 in search mode
        lot_number: undefined,
        expiration_date: undefined,
      });
    }
    
    // Update productItems with actual NDCs from return_reports
    productItems = Array.from(actualNdcToProduct.entries()).map(([ndc, info]) => ({
      id: info.id,
      ndc,
      product_name: info.product_name,
      quantity: info.quantity,
      lot_number: info.lot_number,
      expiration_date: info.expiration_date,
    }));
    
    console.log(`📦 Final productItems (${productItems.length} items) - ALL FROM RETURN REPORTS:`);
    productItems.forEach(p => {
      console.log(`   - NDC: ${p.ndc}, Name: "${p.product_name}", Quantity: ${p.quantity}`);
    });
    console.log(`=== END MERGING ===\n`);
    
    // Update ndcs array with actual matched NDCs
    ndcs = [...new Set(Array.from(actualNdcToProduct.keys()))];
  }

  // Helper function to get full/partial values for an NDC
  // In search mode: Priority: return_reports data → inventory full_units/partial_units → 0
  // In non-search mode: ONLY use inventory data from current pharmacy's product_list_items (never use return_reports data)
  const getFullPartialForNdc = (ndc: string, productItem?: { full_units?: number; partial_units?: number }): { full: number; partial: number } => {
    // In non-search mode, ONLY use inventory data from current pharmacy's product_list_items
    // IMPORTANT: Never use return_reports data in non-search mode to ensure pharmacy-specific data
    if (!isSearchMode) {
      if (productItem) {
        // Always use productItem data from current pharmacy's product_list_items
        return {
          full: productItem.full_units !== undefined ? productItem.full_units : 0,
          partial: productItem.partial_units !== undefined ? productItem.partial_units : 0,
        };
      }
      // If no productItem in non-search mode, return 0 (should not happen as productItem should always be provided)
      return { full: 0, partial: 0 };
    }
    
    // Search mode: Use return_reports data first, then fallback to inventory
    // Try exact match first from return_reports data
    if (ndcToFullMap[ndc] !== undefined || ndcToPartialMap[ndc] !== undefined) {
      return {
        full: ndcToFullMap[ndc] !== undefined ? ndcToFullMap[ndc] : 0,
        partial: ndcToPartialMap[ndc] !== undefined ? ndcToPartialMap[ndc] : 0,
      };
    }
    
    // Try normalized version (without dashes)
    const normalizedNdc = String(ndc).replace(/-/g, '').trim();
    if (ndcToFullMap[normalizedNdc] !== undefined || ndcToPartialMap[normalizedNdc] !== undefined) {
      return {
        full: ndcToFullMap[normalizedNdc] !== undefined ? ndcToFullMap[normalizedNdc] : 0,
        partial: ndcToPartialMap[normalizedNdc] !== undefined ? ndcToPartialMap[normalizedNdc] : 0,
      };
    }
    
    // Try all keys to find a match (fallback for different key formats)
    for (const key in ndcToFullMap) {
      const keyNormalized = String(key).replace(/-/g, '').trim();
      const ndcNormalized = String(ndc).replace(/-/g, '').trim();
      if (key === ndc || keyNormalized === ndcNormalized || key === normalizedNdc || keyNormalized === ndc) {
        return {
          full: ndcToFullMap[key] !== undefined ? ndcToFullMap[key] : 0,
          partial: ndcToPartialMap[key] !== undefined ? ndcToPartialMap[key] : 0,
        };
      }
    }
    
    // Fallback to inventory's full_units/partial_units if no return_reports data (search mode only)
    if (productItem) {
      return {
        full: productItem.full_units !== undefined ? productItem.full_units : 0,
        partial: productItem.partial_units !== undefined ? productItem.partial_units : 0,
      };
    }
    
    // Default: both 0
    return { full: 0, partial: 0 };
  };

  // Build recommendations - only process items from current pharmacy's product_list_items
  // Each productItem is already filtered by pharmacy_id (added_by = pharmacyId)
  productItems.forEach((productItem) => {
    const ndc = productItem.ndc;
    // Only get pricing data for NDCs that match this pharmacy's inventory
    const pricingData = ndcPricingMap[ndc] || [];
    const fullPartial = getFullPartialForNdc(ndc, productItem);

    if (pricingData.length === 0) {
      // No pricing data found for this NDC - still return recommendation with default values
      // In search mode, quantity should always be 1
      const quantity = isSearchMode ? 1 : (productItem.quantity || 1);
      recommendations.push({
        id: productItem.id,
        ndc,
        productName: productItem.product_name || `Product ${ndc}`,
        quantity: quantity,
        full: fullPartial.full,
        partial: fullPartial.partial,
        lotNumber: productItem.lot_number || undefined,
        expirationDate: productItem.expiration_date || undefined,
        recommendedDistributor: '', // Empty recommended distributor field
        recommendedDistributorContact: undefined,
        expectedPrice: 0, // Default 0 price
        worstPrice: 0, // Default 0 price
        alternativeDistributors: [], // Empty alternatives
        savings: 0, // Default 0 savings
        available: true,
      });
      return;
    }

    // Group by distributor and get average price per unit
    // Use a Map to ensure we properly track all unique distributors
    const distributorPrices: Record<
      string,
      { totalPrice: number; totalQuantity: number; count: number; prices: number[] }
    > = {};

    pricingData.forEach((pricing) => {
      const distName = (pricing.distributorName || 'Unknown Distributor').trim();
      if (!distributorPrices[distName]) {
        distributorPrices[distName] = {
          totalPrice: 0,
          totalQuantity: 0,
          count: 0,
          prices: [],
        };
      }
      distributorPrices[distName].totalPrice += pricing.pricePerUnit;
      distributorPrices[distName].totalQuantity += pricing.quantity;
      distributorPrices[distName].count += 1;
      distributorPrices[distName].prices.push(pricing.pricePerUnit);
    });

    // Debug: Log distributor processing for this NDC
    const distributorCount = Object.keys(distributorPrices).length;
    console.log(`\n--- Processing NDC ${ndc} ---`);
    console.log(`Raw pricing data entries: ${pricingData.length}`);
    console.log(`Unique distributors after grouping: ${distributorCount}`);
    
    Object.entries(distributorPrices).forEach(([distName, data]) => {
      console.log(`  "${distName}": ${data.count} records, avg price: ${(data.totalPrice / data.count).toFixed(3)}`);
    });
    
    if (distributorCount === 1) {
      console.log(`⚠️ Only 1 distributor found for NDC ${ndc} - no alternatives possible`);
    }

    // Determine if this inventory item needs full or partial prices
    // An item with full_units > 0 needs FULL price records from return_reports
    // An item with partial_units > 0 needs PARTIAL price records from return_reports
    const needsFullPrice = fullPartial.full > 0;
    const needsPartialPrice = fullPartial.partial > 0;

    // Calculate price per distributor
    // IMPORTANT: Only use prices that match the inventory item's unit type
    // If no matching price exists, that distributor should NOT be recommended
    const distributorAverages: Array<{ name: string; price: number; fullPrice?: number; partialPrice?: number }> = Object.entries(
      distributorPrices
    )
      .filter(([_, data]) => data.count > 0) // Ensure we have valid data
      .map(([name, data]) => {
        const distributorName = name.trim();
        let price: number = 0; // Default to 0 - means no valid price for this unit type
        
        const distributorNdcKey = `${distributorName}|${ndc}`;
        
        // Get full and partial prices (available in ALL modes now)
        const fullPrice = distributorNdcToFullPriceMap[distributorNdcKey] || 0;
        const partialPrice = distributorNdcToPartialPriceMap[distributorNdcKey] || 0;
        
        if (isSearchMode) {
          // In search mode, use the FULL price as the main price if available
          // This ensures consistency with non-search mode which filters by unit type
          // If no full price, use partial price; if neither, price stays 0
          if (fullPrice && fullPrice > 0) {
            price = fullPrice;
            console.log(`   💰 Using FULL price for ${distributorName}|${ndc}: ${price}`);
          } else if (partialPrice && partialPrice > 0) {
            price = partialPrice;
            console.log(`   💰 Using PARTIAL price for ${distributorName}|${ndc}: ${price} (no full price available)`);
          } else {
            price = 0;
            console.log(`   ⚠️ No full/partial price found for ${distributorName}|${ndc}`);
          }
        } else {
          // Non-search mode: STRICT matching based on inventory item's unit type
          // If inventory has full > 0, ONLY use fullPrice (don't fallback to anything else)
          // If inventory has partial > 0, ONLY use partialPrice (don't fallback to anything else)
          // This ensures that if no matching return_report records exist, there's NO recommended distributor
          
          if (needsFullPrice) {
            // Inventory item has full units - ONLY use full price
            if (fullPrice > 0) {
              price = fullPrice;
              console.log(`   💰 Using FULL price for full-unit item ${distributorName}|${ndc}: ${price}`);
          } else {
              price = 0; // No full price record exists - this distributor won't be recommended
              console.log(`   ❌ No FULL price for ${distributorName}|${ndc} - distributor not available for full units`);
            }
          } else if (needsPartialPrice) {
            // Inventory item has partial units - ONLY use partial price
            if (partialPrice > 0) {
              price = partialPrice;
              console.log(`   💰 Using PARTIAL price for partial-unit item ${distributorName}|${ndc}: ${price}`);
            } else {
              price = 0; // No partial price record exists - this distributor won't be recommended
              console.log(`   ❌ No PARTIAL price for ${distributorName}|${ndc} - distributor not available for partial units`);
            }
          } else {
            // Edge case: item has neither full nor partial? Use latest price as fallback
            const latestPrice = distributorNdcToLatestPriceMap[distributorNdcKey];
            price = latestPrice !== undefined ? latestPrice : 0;
            console.log(`   ⚠️ Item has no full/partial units, using fallback price: ${price}`);
          }
        }
        
        console.log(`   💰 ${distributorName}|${ndc}: price=${price}, fullPrice=${fullPrice}, partialPrice=${partialPrice}, needsFullPrice=${needsFullPrice}, needsPartialPrice=${needsPartialPrice}`);
        
        return {
          name: distributorName,
          price,
          fullPrice,
          partialPrice,
        };
      })
      // Filter out distributors with price 0 (no matching unit type records)
      .filter(d => d.price > 0);
    
    // Debug: Log all distributor averages
    console.log(`📊 Distributor averages for NDC ${ndc}:`, distributorAverages.map(d => `${d.name}: ${d.price}`).join(', '));

    if (distributorAverages.length === 0) {
      // No distributor averages - still return recommendation with default values
      // In search mode, quantity should always be 1
      const quantity = isSearchMode ? 1 : (productItem.quantity || 1);
      recommendations.push({
        id: productItem.id,
        ndc,
        productName: productItem.product_name || `Product ${ndc}`,
        quantity: quantity,
        full: fullPartial.full,
        partial: fullPartial.partial,
        lotNumber: productItem.lot_number || undefined,
        expirationDate: productItem.expiration_date || undefined,
        recommendedDistributor: '', // Empty recommended distributor field
        recommendedDistributorContact: undefined,
        expectedPrice: 0, // Default 0 price
        worstPrice: 0, // Default 0 price
        alternativeDistributors: [], // Empty alternatives
        savings: 0, // Default 0 savings
        available: true,
      });
      return;
    }

    // Sort by price (highest first = best) - highest price means highest credit/return value
    distributorAverages.sort((a, b) => b.price - a.price);

    // Store distributor averages for later use (before availability check)
    const allDistributorsSorted = distributorAverages;

    // Debug: Log final results
    console.log(`📊 Final result for NDC ${ndc}:`);
    console.log(`   - Total distributors: ${distributorAverages.length}`);
    console.log(`--- End NDC ${ndc} ---\n`);

    // Calculate worst price (lowest price from all distributors)
    // In search mode, this will be the lowest latest price; otherwise lowest average price
    const worstPrice = distributorAverages.length > 0 
      ? distributorAverages[distributorAverages.length - 1].price 
      : 0;
    
    // In search mode, quantity should always be 1
    const quantity = isSearchMode ? 1 : (productItem.quantity || 1);
    
    // Store the distributor averages for this NDC (we'll select recommended after availability check)
    recommendations.push({
      id: productItem.id,
      ndc,
      productName: productItem.product_name || `Product ${ndc}`,
      quantity: quantity,
      full: fullPartial.full,
      partial: fullPartial.partial,
      lotNumber: productItem.lot_number || undefined,
      expirationDate: productItem.expiration_date || undefined,
      recommendedDistributor: '', // Will be set after availability check
      expectedPrice: 0, // Will be set after availability check
      worstPrice: worstPrice, // Lowest price (latest in search mode, average otherwise)
      alternativeDistributors: [], // Will be set after availability check
      savings: 0, // Will be calculated after availability check
      _distributorAverages: allDistributorsSorted, // Temporary storage for availability check
    });
  });

  // Collect all unique distributor names from recommendations (before availability check)
  const distributorNames = new Set<string>();
  recommendations.forEach((rec) => {
    rec._distributorAverages?.forEach((dist) => {
      distributorNames.add(dist.name);
    });
  });

  // Fetch distributor IDs and contact info from reverse_distributors table
  const distributorNameToIdMap: Record<string, string> = {};
  const distributorContactInfoMap: Record<string, {
    email?: string;
    phone?: string;
    location?: string;
  }> = {};
  
  if (distributorNames.size > 0) {
    const { data: distributors, error: distError } = await db
      .from('reverse_distributors')
      .select('id, name, contact_email, contact_phone, address')
      .in('name', Array.from(distributorNames));

    if (!distError && distributors) {
      distributors.forEach((dist) => {
        distributorNameToIdMap[dist.name] = dist.id;
        
        // Format location from address - combine all components into one string
        let location: string | undefined;
        if (dist.address) {
          const addr = dist.address;
          const locationParts: string[] = [];
          
          // Add street if available
          if (addr.street) {
            locationParts.push(addr.street);
          }
          
          // Add city if available
          if (addr.city) {
            locationParts.push(addr.city);
          }
          
          // Add state if available
          if (addr.state) {
            locationParts.push(addr.state);
          }
          
          // Add zipCode if available
          if (addr.zipCode) {
            locationParts.push(addr.zipCode);
          }
          
          // Add country if available
          if (addr.country) {
            locationParts.push(addr.country);
          }
          
          // Combine all parts with comma and space
          if (locationParts.length > 0) {
            location = locationParts.join(', ');
          }
        }
        
        distributorContactInfoMap[dist.name] = {
          email: dist.contact_email || undefined,
          phone: dist.contact_phone || undefined,
          location,
        };
      });
    }
  }

  // COMMENTED OUT: Check availability for each distributor
  // Get the most recent report_date for each pharmacy-distributor combination
  // const distributorAvailabilityMap: Record<string, boolean> = {};
  
  // for (const distributorName of distributorNames) {
  //   const distributorId = distributorNameToIdMap[distributorName];
  //   
  //   if (!distributorId) {
  //     // If distributor not found, mark as unavailable
  //     distributorAvailabilityMap[distributorName] = false;
  //     continue;
  //   }

  //   // Get the most recent report_date for this pharmacy-distributor combination
  //   const { data: recentDocuments, error: docError } = await db
  //     .from('uploaded_documents')
  //     .select('report_date')
  //     .eq('pharmacy_id', pharmacyId)
  //     .eq('reverse_distributor_id', distributorId)
  //     .not('report_date', 'is', null)
  //     .order('report_date', { ascending: false })
  //     .limit(1);

  //   if (docError || !recentDocuments || recentDocuments.length === 0 || !recentDocuments[0]?.report_date) {
  //     // No data found, mark as available (no recent activity)
  //     distributorAvailabilityMap[distributorName] = true;
  //     continue;
  //   }

  //   const recentDocument = recentDocuments[0];

  //   // Check if report_date is within last 30 days
  //   const reportDate = new Date(recentDocument.report_date);
  //   const today = new Date();
  //   const thirtyDaysAgo = new Date();
  //   thirtyDaysAgo.setDate(today.getDate() - 30);
  //   const reportDateStr = reportDate.toISOString().split('T')[0];
  //   const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  //   
  //   // If report_date is within last 30 days, mark as unavailable (active = false)
  //   // Otherwise, mark as available (active = true)
  //   distributorAvailabilityMap[distributorName] = reportDateStr < thirtyDaysAgoStr;
  // }

  // Now update recommendations: select highest price distributor as recommended (no availability check)
  recommendations.forEach((rec) => {
    if (!rec._distributorAverages || rec._distributorAverages.length === 0) {
      console.log(`⚠️ No distributor averages for NDC ${rec.ndc} - skipping recommendation update`);
      return;
    }

    console.log(`\n🔧 Building recommendations for NDC ${rec.ndc}`);
    console.log(`   Total distributors in _distributorAverages: ${rec._distributorAverages.length}`);
    console.log(`   Distributors:`, rec._distributorAverages.map(d => `${d.name} (${d.price})`).join(', '));

    // COMMENTED OUT: Find the highest price distributor that IS available
    // Now just use the highest price distributor (first one since already sorted)
    let recommended: { name: string; price: number; fullPrice?: number; partialPrice?: number } | null = null;
    const alternatives: Array<{ 
      id?: string; // Distributor UUID
      name: string; 
      price: number;
      fullPrice?: number;
      partialPrice?: number;
      difference: number; 
      available: boolean;
      email?: string;
      phone?: string;
      location?: string;
    }> = [];

    // COMMENTED OUT: First, find the highest available distributor
    // for (const dist of rec._distributorAverages) {
    //   const isAvailable = distributorAvailabilityMap[dist.name] ?? false;
    //   
    //   if (!recommended && isAvailable) {
    //     // First available distributor (which is also highest price since sorted)
    //     recommended = dist;
    //     break; // Found the recommended one
    //   }
    // }

    // If no available distributor found, use the highest price one anyway (even if unavailable)
    // CHANGED: Just use the highest price distributor (first one since sorted by price desc)
    if (rec._distributorAverages.length > 0) {
      recommended = rec._distributorAverages[0]; // Highest price distributor
      console.log(`   ✅ Recommended distributor: ${recommended.name} (price: ${recommended.price})`);
    }

    // Now build alternatives list (all distributors except the recommended one)
    if (recommended) {
      rec._distributorAverages.forEach((dist) => {
        if (dist.name !== recommended!.name) {
          const contactInfo = distributorContactInfoMap[dist.name] || {};
          const distributorId = distributorNameToIdMap[dist.name];
          alternatives.push({
            id: distributorId, // Add distributor UUID
            name: dist.name,
            price: dist.price,
            fullPrice: dist.fullPrice,
            partialPrice: dist.partialPrice,
            difference: dist.price - recommended!.price, // Negative means lower price (worse)
            // available: distributorAvailabilityMap[dist.name] ?? false,
            email: contactInfo.email,
            phone: contactInfo.phone,
            location: contactInfo.location,
            // COMMENTED OUT: available: distributorAvailabilityMap[dist.name] ?? false,
            available: true, // Always mark as available since we're not checking
          });
          console.log(`   ➕ Added alternative: ${dist.name} (id: ${distributorId}, price: ${dist.price}, fullPrice: ${dist.fullPrice}, partialPrice: ${dist.partialPrice}, difference: ${dist.price - recommended!.price})`);
        }
      });
      console.log(`   📋 Total alternatives: ${alternatives.length}`);
    } else {
      console.log(`   ⚠️ No recommended distributor found`);
    }

    if (recommended) {
      const recommendedContactInfo = distributorContactInfoMap[recommended.name] || {};
      const recommendedDistributorId = distributorNameToIdMap[recommended.name];
      rec.recommendedDistributor = recommended.name;
      rec.recommendedDistributorId = recommendedDistributorId; // Add distributor UUID
      rec.recommendedDistributorContact = {
        email: recommendedContactInfo.email,
        phone: recommendedContactInfo.phone,
        location: recommendedContactInfo.location,
      };
      rec.expectedPrice = recommended.price;
      // In search mode, add full and partial prices from recommended distributor
      rec.fullPricePerUnit = recommended.fullPrice;
      rec.partialPricePerUnit = recommended.partialPrice;
      // COMMENTED OUT: rec.available = distributorAvailabilityMap[recommended.name] ?? false;
      rec.available = true; // Always mark as available since we're not checking
      rec.alternativeDistributors = alternatives;
      
      // Calculate savings (difference between recommended and worst price)
      const worstPrice = rec.worstPrice;
      rec.savings = Math.max(0, (recommended.price - worstPrice) * (rec.quantity || 1));
      
      console.log(`   💰 Set prices for ${rec.ndc}: recommendedDistributor=${rec.recommendedDistributor} (id: ${recommendedDistributorId}), expectedPrice=${rec.expectedPrice}, fullPricePerUnit=${rec.fullPricePerUnit}, partialPricePerUnit=${rec.partialPricePerUnit}`);
    }

    // Remove temporary storage
    delete (rec as any)._distributorAverages;
  });

  // Calculate total potential savings after updating recommendations
  const totalPotentialSavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);

  // Calculate distributor usage statistics
  // Calculate 30 days ago once
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Fetch all data in parallel for better performance
  const [activeDistributorsResult, documentsResult] = await Promise.all([
    db.from('reverse_distributors').select('id').eq('is_active', true),
    db.from('uploaded_documents')
      .select('reverse_distributor_id, report_date')
        .eq('pharmacy_id', pharmacyId)
        .not('report_date', 'is', null)
        .order('report_date', { ascending: false })
  ]);

  const allActiveDistributors = activeDistributorsResult.data || [];
  const totalDistributors = allActiveDistributors.length;

  // Build a map of most recent report date per distributor
  const distributorLastReportMap = new Map<string, string>();
  if (documentsResult.data) {
    for (const doc of documentsResult.data) {
      if (doc.reverse_distributor_id && doc.report_date) {
        const existing = distributorLastReportMap.get(doc.reverse_distributor_id);
        // Keep only the most recent date (data is already sorted desc)
        if (!existing) {
          distributorLastReportMap.set(doc.reverse_distributor_id, doc.report_date);
        }
      }
    }
  }

  // Count distributors used this month
  let usedThisMonth = 0;
  for (const dist of allActiveDistributors) {
    const lastReportDate = distributorLastReportMap.get(dist.id);
    if (lastReportDate) {
      const reportDateStr = new Date(lastReportDate).toISOString().split('T')[0];
      if (reportDateStr >= thirtyDaysAgoStr) {
        usedThisMonth++;
      }
    }
  }

  const stillAvailable = Math.max(0, totalDistributors - usedThisMonth);

  // COMMENTED OUT: Create a map to check if a distributor (by name) is still available this month
  // A distributor is "still available this month" if last document's report_date is NOT within last 30 days
  // const distributorNameToStillAvailableMap: Record<string, boolean> = {};
  
  // // Check each distributor name - use same logic: order by report_date DESC and check latest
  // for (const distributorName of distributorNames) {
  //   const distributorId = distributorNameToIdMap[distributorName];
  //   
  //   if (!distributorId) {
  //     // If we don't have an ID, assume it's available
  //     distributorNameToStillAvailableMap[distributorName] = true;
  //     continue;
  //   }

  //   // Get the most recent document for this pharmacy and distributor (by report_date)
  //   const { data: lastDocument, error: docError } = await db
  //     .from('uploaded_documents')
  //     .select('report_date')
  //     .eq('pharmacy_id', pharmacyId)
  //     .eq('reverse_distributor_id', distributorId)
  //     .not('report_date', 'is', null)
  //     .order('report_date', { ascending: false })
  //     .limit(1)
  //     .maybeSingle();

  //   if (docError || !lastDocument || !lastDocument.report_date) {
  //     // No document found, mark as available
  //     distributorNameToStillAvailableMap[distributorName] = true;
  //     continue;
  //   }

  //   // Check if last document's report_date is within last 30 days
  //   const reportDateStr = new Date(lastDocument.report_date).toISOString().split('T')[0];
  //   // If within 30 days, NOT available (used this month)
  //   // If older than 30 days, available (still available this month)
  //   distributorNameToStillAvailableMap[distributorName] = reportDateStr < thirtyDaysAgoStr;
  // }
  
  // CHANGED: Mark all distributors as available since we're not checking
  const distributorNameToStillAvailableMap: Record<string, boolean> = {};
  for (const distributorName of distributorNames) {
    distributorNameToStillAvailableMap[distributorName] = true;
  }

  // Calculate earnings comparison
  // Single Distributor Strategy: Pick ONE distributor and use it for ALL products
  // Find which single distributor gives the best total earnings across all products
  const allDistributorNames = new Set<string>();
  recommendations.forEach((rec) => {
    allDistributorNames.add(rec.recommendedDistributor);
    rec.alternativeDistributors.forEach((alt) => {
      allDistributorNames.add(alt.name);
    });
  });

  // Calculate total earnings for each distributor if used for ALL products
  const distributorTotalEarnings: Record<string, number> = {};
  
  for (const distributorName of allDistributorNames) {
    // COMMENTED OUT: const stillAvailable = distributorNameToStillAvailableMap[distributorName] ?? false;
    // COMMENTED OUT: if (!stillAvailable) continue; // Skip distributors not available this month
    
    let totalEarnings = 0;
    
    recommendations.forEach((rec) => {
      // Find price for this distributor for this product
      let price: number | null = null;
      
      if (rec.recommendedDistributor === distributorName) {
        price = rec.expectedPrice;
      } else {
        const altDist = rec.alternativeDistributors.find(alt => alt.name === distributorName);
        if (altDist) {
          price = altDist.price;
        }
      }
      
      // If distributor has this product, use their price; otherwise use worst price (conservative estimate)
      const finalPrice = price !== null ? price : rec.worstPrice;
      totalEarnings += finalPrice * rec.quantity;
    });
    
    distributorTotalEarnings[distributorName] = totalEarnings;
  }

  // Find the best single distributor (highest total earnings)
  const bestSingleDistributor = Object.entries(distributorTotalEarnings)
    .sort((a, b) => b[1] - a[1])[0];
  
  const singleDistributorStrategy = bestSingleDistributor ? bestSingleDistributor[1] : 0;

  // Multiple Distributors Strategy: Using the best distributor that's still available this month for each product
  // This allows using different distributors for different products to maximize earnings
  let multipleDistributorsStrategy = 0;

  recommendations.forEach((rec) => {
    // Find the best distributor that's still available this month (including recommended and alternatives)
    const allOptions = [
      { 
        name: rec.recommendedDistributor, 
        price: rec.expectedPrice, 
        stillAvailableThisMonth: distributorNameToStillAvailableMap[rec.recommendedDistributor] ?? false 
      },
      ...rec.alternativeDistributors.map((alt) => ({
        name: alt.name,
        price: alt.price,
        stillAvailableThisMonth: distributorNameToStillAvailableMap[alt.name] ?? false,
      })),
    ];

    // COMMENTED OUT: Filter to only distributors still available this month and sort by price (highest first)
    // CHANGED: Just sort by price (highest first) without filtering by availability
    const availableThisMonthOptions = allOptions
      // COMMENTED OUT: .filter((opt) => opt.stillAvailableThisMonth)
      .sort((a, b) => b.price - a.price);

    if (availableThisMonthOptions.length > 0) {
      // Use the best distributor (highest price)
      const bestAvailable = availableThisMonthOptions[0];
      const earnings = bestAvailable.price * rec.quantity;
      multipleDistributorsStrategy += earnings;
    } else {
      // If no distributors found, use the recommended one anyway
      const earnings = rec.expectedPrice * rec.quantity;
      multipleDistributorsStrategy += earnings;
    }
  });

  const potentialAdditionalEarnings = Math.max(0, multipleDistributorsStrategy - singleDistributorStrategy);

  // Filter recommendations by search NDCs if in search mode
  let filteredRecommendations = recommendations;
  if (isSearchMode && searchNdcs && searchNdcs.length > 0) {
    console.log(`\n=== FILTERING RECOMMENDATIONS ===`);
    console.log(`Total recommendations before filter:`, recommendations.length);
    console.log(`Recommendations NDCs:`, recommendations.map(r => r.ndc));
    
    // Normalize search NDCs for comparison (remove dashes)
    const normalizedSearchNdcs = searchNdcs.map(n => String(n).replace(/-/g, '').trim().toLowerCase());
    console.log(`Original search NDCs (from user):`, searchNdcs);
    console.log(`Normalized search NDCs (for filter):`, normalizedSearchNdcs);
    
    // Filter recommendations to only include those matching the search NDCs
    // Use exact matching after normalization to ensure we only return the specific NDCs requested
    filteredRecommendations = recommendations.filter(rec => {
      const normalizedRecNdc = String(rec.ndc).replace(/-/g, '').trim().toLowerCase();
      const matches = normalizedSearchNdcs.some(searchNdc => 
        normalizedRecNdc === searchNdc
      );
      console.log(`Checking rec.ndc="${rec.ndc}" (normalized="${normalizedRecNdc}") → ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
      return matches;
    });
    
    console.log(`Total recommendations after filter:`, filteredRecommendations.length);
    console.log(`=== END FILTERING ===\n`);
    
    // Recalculate totalPotentialSavings based on filtered recommendations
    const filteredTotalPotentialSavings = filteredRecommendations.reduce((sum, rec) => sum + rec.savings, 0);
    
    // Recalculate earnings comparison based on filtered recommendations
    const filteredAllDistributorNames = new Set<string>();
    filteredRecommendations.forEach((rec) => {
      filteredAllDistributorNames.add(rec.recommendedDistributor);
      rec.alternativeDistributors.forEach((alt) => {
        filteredAllDistributorNames.add(alt.name);
      });
    });

    const filteredDistributorTotalEarnings: Record<string, number> = {};
    
    for (const distributorName of filteredAllDistributorNames) {
      let totalEarnings = 0;
      
      filteredRecommendations.forEach((rec) => {
        let price: number | null = null;
        
        if (rec.recommendedDistributor === distributorName) {
          price = rec.expectedPrice;
        } else {
          const altDist = rec.alternativeDistributors.find(alt => alt.name === distributorName);
          if (altDist) {
            price = altDist.price;
          }
        }
        
        const finalPrice = price !== null ? price : rec.worstPrice;
        totalEarnings += finalPrice * rec.quantity;
      });
      
      filteredDistributorTotalEarnings[distributorName] = totalEarnings;
    }

    const filteredBestSingleDistributor = Object.entries(filteredDistributorTotalEarnings)
      .sort((a, b) => b[1] - a[1])[0];
    
    const filteredSingleDistributorStrategy = filteredBestSingleDistributor ? filteredBestSingleDistributor[1] : 0;

    let filteredMultipleDistributorsStrategy = 0;

    filteredRecommendations.forEach((rec) => {
      const allOptions = [
        { 
          name: rec.recommendedDistributor, 
          price: rec.expectedPrice, 
          stillAvailableThisMonth: distributorNameToStillAvailableMap[rec.recommendedDistributor] ?? false 
        },
        ...rec.alternativeDistributors.map((alt) => ({
          name: alt.name,
          price: alt.price,
          stillAvailableThisMonth: distributorNameToStillAvailableMap[alt.name] ?? false,
        })),
      ];

      const availableThisMonthOptions = allOptions
        .sort((a, b) => b.price - a.price);

      if (availableThisMonthOptions.length > 0) {
        const bestAvailable = availableThisMonthOptions[0];
        const earnings = bestAvailable.price * rec.quantity;
        filteredMultipleDistributorsStrategy += earnings;
      } else {
        const earnings = rec.expectedPrice * rec.quantity;
        filteredMultipleDistributorsStrategy += earnings;
      }
    });

    const filteredPotentialAdditionalEarnings = Math.max(0, filteredMultipleDistributorsStrategy - filteredSingleDistributorStrategy);

    return {
      recommendations: filteredRecommendations,
      totalPotentialSavings: filteredTotalPotentialSavings,
      generatedAt: new Date().toISOString(),
      distributorUsage: {
        usedThisMonth,
        totalDistributors,
        stillAvailable,
      },
      earningsComparison: {
        singleDistributorStrategy: Math.round(filteredSingleDistributorStrategy * 100) / 100,
        multipleDistributorsStrategy: Math.round(filteredMultipleDistributorsStrategy * 100) / 100,
        potentialAdditionalEarnings: Math.round(filteredPotentialAdditionalEarnings * 100) / 100,
      },
    };
  }

  return {
    recommendations,
    totalPotentialSavings,
    generatedAt: new Date().toISOString(),
    distributorUsage: {
      usedThisMonth,
      totalDistributors,
      stillAvailable,
    },
    earningsComparison: {
      singleDistributorStrategy: Math.round(singleDistributorStrategy * 100) / 100,
      multipleDistributorsStrategy: Math.round(multipleDistributorsStrategy * 100) / 100,
      potentialAdditionalEarnings: Math.round(potentialAdditionalEarnings * 100) / 100,
    },
  };
};

// Package Recommendation Interfaces
export interface PackageProduct {
  ndc: string;
  productId?: string; // Product ID from product_list_items
  productName: string;
  full: number;
  partial: number;
  pricePerUnit: number;
  totalValue: number;
}

export interface DistributorPackage {
  distributorName: string;
  distributorId?: string;
  distributorContact?: {
    email?: string;
    phone?: string;
    location?: string;
    feeRates?: DistributorFeeRates;
  };
  products: PackageProduct[];
  totalItems: number;
  totalEstimatedValue: number;
  averagePricePerUnit: number;
}

export interface PackageRecommendationResponse {
  packages: DistributorPackage[];
  totalProducts: number;
  totalPackages: number;
  totalEstimatedValue: number;
  generatedAt: string;
  summary: {
    productsWithPricing: number;
    productsWithoutPricing: number;
    distributorsUsed: number;
  };
}

/**
 * Get package recommendations for pharmacy products
 * Groups products by distributor based on best prices
 */
// Get package recommendations for pharmacy - uses SQL RPC function
// NO JS loops - everything done in SQL
export const getPackageRecommendations = async (
  pharmacyId: string
): Promise<PackageRecommendationResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  console.log('🚀 Calling get_package_recommendations RPC function...');
  
  const { data: rpcResult, error: rpcError } = await db.rpc('get_package_recommendations', {
    p_pharmacy_id: pharmacyId,
  });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError.message);
    throw new AppError(`Failed to get package recommendations: ${rpcError.message}`, 500);
  }

  if (!rpcResult) {
    throw new AppError('No data returned from package recommendations', 500);
  }

  console.log('✅ RPC function executed successfully');
  
  // Return the result directly - all processing done in SQL
  return {
    packages: rpcResult.packages || [],
    totalProducts: rpcResult.totalProducts || 0,
    totalPackages: rpcResult.totalPackages || 0,
    totalEstimatedValue: rpcResult.totalEstimatedValue || 0,
    generatedAt: rpcResult.generatedAt || new Date().toISOString(),
    summary: rpcResult.summary || {
      productsWithPricing: 0,
      productsWithoutPricing: 0,
      distributorsUsed: 0,
    },
  };
};

// Get package recommendations by NDC codes
export const getPackageRecommendationsByNdcs = async (
  ndcs: string[]
): Promise<PackageRecommendationResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  if (!ndcs || ndcs.length === 0) {
    return {
      packages: [],
      totalProducts: 0,
      totalPackages: 0,
      totalEstimatedValue: 0,
      generatedAt: new Date().toISOString(),
      summary: {
        productsWithPricing: 0,
        productsWithoutPricing: 0,
        distributorsUsed: 0,
      },
    };
  }

  // Step 1: Normalize and deduplicate NDCs
  const normalizedNdcs = [...new Set(ndcs.map((ndc) => ndc.trim()).filter((ndc) => ndc.length > 0))];

  if (normalizedNdcs.length === 0) {
    return {
      packages: [],
      totalProducts: 0,
      totalPackages: 0,
      totalEstimatedValue: 0,
      generatedAt: new Date().toISOString(),
      summary: {
        productsWithPricing: 0,
        productsWithoutPricing: 0,
        distributorsUsed: 0,
      },
    };
  }

  // Step 2: Get product information from products table
  const { data: products, error: productsError } = await db
    .from('products')
    .select('ndc, product_name')
    .in('ndc', normalizedNdcs);

  // Create a map of NDC to product name
  const ndcToProductNameMap: Record<string, string> = {};
  if (!productsError && products) {
    products.forEach((product) => {
      ndcToProductNameMap[product.ndc] = product.product_name;
    });
  }

  // Step 3: Get pricing data from return_reports
  // Join with uploaded_documents and reverse_distributors to get distributor name
  // IMPORTANT: Create a fresh query for each batch to avoid query builder reuse issues
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
        name
      )
    )
  `;

  // Fetch ALL records using pagination (Supabase default limit is 1000)
  // Fetch in batches of 1000 until we get all records
  console.log(`📊 getPackageRecommendationsByNdcs: Fetching ALL return_reports using pagination...`);
  const returnReports: any[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Create a FRESH query for each batch
    const batchQuery = db
      .from('return_reports')
      .select(selectFields)
      .range(offset, offset + batchSize - 1);
    
    const { data: batch, error: batchError } = await batchQuery;

    if (batchError) {
      throw new AppError(`Failed to fetch return reports: ${batchError.message}`, 400);
    }

    if (batch && batch.length > 0) {
      returnReports.push(...batch);
      offset += batchSize;
      console.log(`   ✅ Fetched ${returnReports.length} records so far...`);
      
      // If we got fewer records than batch size, we've reached the end
      if (batch.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Total return_reports fetched: ${returnReports.length}`);

  // Sort by report_date (latest first) for determining latest prices
  // Priority: report_date > uploaded_at > created_at
  if (returnReports && returnReports.length > 0) {
    returnReports.sort((a: any, b: any) => {
      const dateA = a.uploaded_documents?.report_date || a.uploaded_documents?.uploaded_at || a.created_at;
      const dateB = b.uploaded_documents?.report_date || b.uploaded_documents?.uploaded_at || b.created_at;
      const dateAObj = dateA ? new Date(dateA) : new Date(0);
      const dateBObj = dateB ? new Date(dateB) : new Date(0);
      return dateBObj.getTime() - dateAObj.getTime();
    });
    console.log(`📅 Sorted ${returnReports.length} return reports by report_date (latest first)`);
  }

  // Map to track latest price per distributor-NDC combination
  const distributorNdcToLatestPriceMap: Record<string, number> = {};
  // Maps to track FULL and PARTIAL prices separately per distributor-NDC combination
  const distributorNdcToFullPriceMap: Record<string, number> = {};
  const distributorNdcToPartialPriceMap: Record<string, number> = {};

  // Step 4: Build pricing map (NDC -> Distributor -> Best Price)
  const ndcPricingMap: Record<
    string,
    Array<{
      distributorName: string;
      pricePerUnit: number;
      creditAmount: number;
      quantity: number;
    }>
  > = {};

  // Initialize map for all NDCs
  normalizedNdcs.forEach((ndc) => {
    ndcPricingMap[ndc] = [];
  });

  // Process return reports to extract pricing
  (returnReports || []).forEach((report: any) => {
    const data = report.data;
    // Get distributor name from joined reverse_distributors table, fallback to data field, then Unknown
    const distributorName = (report.uploaded_documents?.reverse_distributors?.name || 
                           data?.reverseDistributor || 
                           data?.reverseDistributorInfo?.name ||
                           'Unknown Distributor').trim();

    if (!distributorName || distributorName === 'Unknown Distributor') {
      return;
    }

    let items: any[] = [];

    if (data && typeof data === 'object') {
      if (Array.isArray(data.items)) {
        items = data.items;
      } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        items = [data.items];
      } else if (data.ndcCode || data.ndc) {
        items = [data];
      }
    }

    items.forEach((item: any) => {
      const ndcCode = item.ndcCode || item.ndc;

      if (!ndcCode) {
        return;
      }

      // Normalize NDC for comparison
      const normalizedNdcCode = String(ndcCode).replace(/-/g, '').trim();

      // Find matching NDC from provided list
      const matchingNdc = normalizedNdcs.find((n) => {
        const normalizedProductNdc = String(n).replace(/-/g, '').trim();
        return (
          normalizedProductNdc === normalizedNdcCode ||
          String(n).trim() === String(ndcCode).trim() ||
          normalizedProductNdc === String(ndcCode).replace(/-/g, '').trim()
        );
      });

      if (!matchingNdc) {
        return;
      }

      // Get full and partial values from return report item
      const itemFull = Number(item.full) || 0;
      const itemPartial = Number(item.partial) || 0;

      const quantity = Number(item.quantity) || 1;
      const creditAmount = Number(item.creditAmount) || 0;
      const pricePerUnit =
        Number(item.pricePerUnit) || (quantity > 0 && creditAmount > 0 ? creditAmount / quantity : 0);

      if (pricePerUnit > 0) {
        // Track latest price per distributor-NDC combination
        // Since we sorted by report_date desc, the first matching record is the latest
        const distributorNdcKey = `${distributorName}|${matchingNdc}`;
        if (!distributorNdcToLatestPriceMap[distributorNdcKey]) {
          distributorNdcToLatestPriceMap[distributorNdcKey] = pricePerUnit;
        }
        
        // Track FULL and PARTIAL prices separately
        // A record is for FULL if full > 0 and partial = 0
        // A record is for PARTIAL if partial > 0 and full = 0
        const isFullRecord = itemFull > 0 && itemPartial === 0;
        const isPartialRecord = itemPartial > 0 && itemFull === 0;
        
        if (isFullRecord && !distributorNdcToFullPriceMap[distributorNdcKey]) {
          distributorNdcToFullPriceMap[distributorNdcKey] = pricePerUnit;
        }
        
        if (isPartialRecord && !distributorNdcToPartialPriceMap[distributorNdcKey]) {
          distributorNdcToPartialPriceMap[distributorNdcKey] = pricePerUnit;
        }
        
        ndcPricingMap[matchingNdc].push({
          distributorName,
          pricePerUnit,
          creditAmount,
          quantity,
        });
      }
    });
  });

  // Step 5: For each NDC, find the best distributor (highest price = best return value)
  const ndcDistributorMap: Record<
    string,
    {
      distributorName: string;
      pricePerUnit: number;
    }
  > = {};

  normalizedNdcs.forEach((ndc) => {
    const pricingData = ndcPricingMap[ndc] || [];

    if (pricingData.length === 0) {
      // No pricing data found for this NDC
      return;
    }

    // Group by distributor and use latest price per distributor-NDC
    const distributorPrices: Record<
      string,
      { totalPrice: number; count: number }
    > = {};

    pricingData.forEach((pricing) => {
      const distName = (pricing.distributorName || 'Unknown Distributor').trim();
      if (!distributorPrices[distName]) {
        distributorPrices[distName] = {
          totalPrice: 0,
          count: 0,
        };
      }
      distributorPrices[distName].totalPrice += pricing.pricePerUnit;
      distributorPrices[distName].count += 1;
    });

    // Use latest FULL price per distributor (not average or mixed price)
    // This ensures consistency - use full price if available, otherwise partial, then fallback
    const distributorAverages: Array<{ name: string; price: number }> = Object.entries(
      distributorPrices
    )
      .filter(([_, data]) => data.count > 0)
      .map(([name, data]) => {
        const distributorName = name.trim();
        const distributorNdcKey = `${distributorName}|${ndc}`;
        
        // Priority: Use full price > partial price > latest price > average
        const fullPrice = distributorNdcToFullPriceMap[distributorNdcKey];
        const partialPrice = distributorNdcToPartialPriceMap[distributorNdcKey];
        const latestPrice = distributorNdcToLatestPriceMap[distributorNdcKey];
        
        let price: number;
        if (fullPrice !== undefined && fullPrice > 0) {
          price = fullPrice;
        } else if (partialPrice !== undefined && partialPrice > 0) {
          price = partialPrice;
        } else if (latestPrice !== undefined) {
          price = latestPrice;
        } else {
          price = data.totalPrice / data.count;
        }
        
        return {
          name: distributorName,
          price,
        };
      });

    if (distributorAverages.length === 0) {
      return;
    }

    // Sort by price (highest first = best return value)
    distributorAverages.sort((a, b) => b.price - a.price);

    // Use the best distributor (highest price)
    ndcDistributorMap[ndc] = {
      distributorName: distributorAverages[0].name,
      pricePerUnit: distributorAverages[0].price,
    };
  });

  // Step 6: Group NDCs by distributor (default quantity to 1 for each NDC)
  const distributorPackagesMap: Record<string, PackageProduct[]> = {};

  normalizedNdcs.forEach((ndc) => {
    const distributorInfo = ndcDistributorMap[ndc];

    if (!distributorInfo) {
      // No pricing data for this NDC - skip it
      return;
    }

    // Default to full=1, partial=0 (can be extended to accept full/partial per NDC)
    const full = 1;
    const partial = 0;
    const pricePerUnit = distributorInfo.pricePerUnit;
    const totalValue = pricePerUnit * (full + partial);
    const productName = ndcToProductNameMap[ndc] || `Product ${ndc}`;

    if (!distributorPackagesMap[distributorInfo.distributorName]) {
      distributorPackagesMap[distributorInfo.distributorName] = [];
    }

    distributorPackagesMap[distributorInfo.distributorName].push({
      ndc,
      productName,
      full,
      partial,
      pricePerUnit,
      totalValue,
    });
  });

  // Step 7: Fetch distributor contact information
  const distributorNames = Object.keys(distributorPackagesMap);
  const distributorNameToIdMap: Record<string, string> = {};
  const distributorContactInfoMap: Record<string, {
    email?: string;
    phone?: string;
    location?: string;
  }> = {};

  if (distributorNames.length > 0) {
    const { data: distributors, error: distError } = await db
      .from('reverse_distributors')
      .select('id, name, contact_email, contact_phone, address')
      .in('name', distributorNames);

    if (!distError && distributors) {
      distributors.forEach((dist) => {
        distributorNameToIdMap[dist.name] = dist.id;

        // Format location from address
        let location: string | undefined;
        if (dist.address) {
          const addr = dist.address;
          const locationParts: string[] = [];

          if (addr.street) locationParts.push(addr.street);
          if (addr.city) locationParts.push(addr.city);
          if (addr.state) locationParts.push(addr.state);
          if (addr.zipCode) locationParts.push(addr.zipCode);
          if (addr.country) locationParts.push(addr.country);

          if (locationParts.length > 0) {
            location = locationParts.join(', ');
          }
        }

        distributorContactInfoMap[dist.name] = {
          email: dist.contact_email || undefined,
          phone: dist.contact_phone || undefined,
          location,
        };
      });
    }
  }

  // Step 8: Build package recommendations
  const packages: DistributorPackage[] = Object.entries(distributorPackagesMap).map(
    ([distributorName, products]) => {
      const totalItems = products.reduce((sum, p) => sum + p.full + p.partial, 0);
      const totalEstimatedValue = products.reduce((sum, p) => sum + p.totalValue, 0);
      const averagePricePerUnit = totalItems > 0 ? totalEstimatedValue / totalItems : 0;

      return {
        distributorName,
        distributorId: distributorNameToIdMap[distributorName],
        distributorContact: distributorContactInfoMap[distributorName],
        products,
        totalItems,
        totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
        averagePricePerUnit: Math.round(averagePricePerUnit * 100) / 100,
      };
    }
  );

  // Sort packages by total estimated value (highest first)
  packages.sort((a, b) => b.totalEstimatedValue - a.totalEstimatedValue);

  // Calculate summary statistics
  const productsWithPricing = Object.keys(ndcDistributorMap).length;
  const productsWithoutPricing = normalizedNdcs.length - productsWithPricing;
  const totalEstimatedValue = packages.reduce((sum, pkg) => sum + pkg.totalEstimatedValue, 0);

  return {
    packages,
    totalProducts: normalizedNdcs.length,
    totalPackages: packages.length,
    totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
    generatedAt: new Date().toISOString(),
    summary: {
      productsWithPricing,
      productsWithoutPricing,
      distributorsUsed: packages.length,
    },
  };
};

// Interface for distributor suggestion
export interface DistributorSuggestion {
  distributorName: string;
  distributorId?: string;
  distributorContact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  pricePerUnit: number;
  totalEstimatedValue: number;
  averagePricePerUnit: number;
  available: boolean;
  recommended: boolean; // true for the distributor with the highest price (best value)
}

export interface NdcSuggestionResponse {
  ndc: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  hasEnoughQuantity: boolean;
  distributors: DistributorSuggestion[];
  generatedAt: string;
}

// Get distributor suggestions for a specific NDC and quantity
export const getDistributorSuggestionsByNdc = async (
  pharmacyId: string,
  ndc: string,
  quantity: number,
  productName?: string
): Promise<NdcSuggestionResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // Normalize NDC
  const normalizedNdc = ndc.trim();
  const normalizedNdcForSearch = normalizedNdc.replace(/-/g, '').trim();

  // Step 1: Check if pharmacy has the product in product_list_items
  // Note: Since quantity field has been removed and replaced with full_units and partial_units,
  // we now only check if the product exists, not the quantity
  const { data: productItems, error: itemsError } = await db
    .from('product_list_items')
    .select('ndc, full_units, partial_units')
    .eq('added_by', pharmacyId);

  if (itemsError) {
    throw new AppError(`Failed to fetch product list items: ${itemsError.message}`, 400);
  }

  // Check if product exists in the list (quantity tracking removed)
  let productExists = false;
  if (productItems && productItems.length > 0) {
    productItems.forEach((item) => {
      const itemNdc = String(item.ndc).trim();
      const normalizedItemNdc = String(item.ndc).replace(/-/g, '').trim();
      
      // Match NDC (with or without dashes)
      if (
        itemNdc === normalizedNdc ||
        normalizedItemNdc === normalizedNdcForSearch ||
        itemNdc === normalizedNdcForSearch ||
        normalizedItemNdc === normalizedNdc
      ) {
        productExists = true;
      }
    });
  }

  // Since we no longer track quantity, we set availableQuantity to 1 if product exists, 0 otherwise
  // This maintains backward compatibility with the response interface
  const availableQuantity = productExists ? 1 : 0;
  const hasEnoughQuantity = productExists; // Product exists means it's available

  // If pharmacy doesn't have enough quantity, return error immediately
  if (!hasEnoughQuantity) {
    // Get product name for error message
    let finalProductName = productName;
    if (!finalProductName) {
      // Try to get from products table
      const { data: product, error: productError } = await db
        .from('products')
        .select('product_name')
        .eq('ndc', normalizedNdc)
        .limit(1)
        .maybeSingle();

      if (!productError && product?.product_name) {
        finalProductName = product.product_name;
      } else {
        // Try to get from product_list_items
        const { data: productItems, error: itemsError } = await db
          .from('product_list_items')
          .select('product_name')
          .eq('added_by', pharmacyId)
          .or(`ndc.eq.${normalizedNdc},ndc.eq.${normalizedNdcForSearch}`)
          .limit(1);

        if (!itemsError && productItems && productItems.length > 0 && productItems[0]?.product_name) {
          finalProductName = productItems[0].product_name;
        } else {
          finalProductName = `Product ${normalizedNdc}`;
        }
      }
    }

    if (availableQuantity === 0) {
      throw new AppError(
        `You don't have this product in your inventory. NDC: ${normalizedNdc}, Product: ${finalProductName}`,
        400
      );
    } else {
      throw new AppError(
        `You don't have enough quantity for this product. NDC: ${normalizedNdc}, Product: ${finalProductName}, Available: ${availableQuantity}, Requested: ${quantity}`,
        400
      );
    }
  }

  // Step 2: Get product name if not provided
  let finalProductName = productName;
  if (!finalProductName) {
    // Try to get from products table
    const { data: product, error: productError } = await db
      .from('products')
      .select('product_name')
      .eq('ndc', normalizedNdc)
      .limit(1)
      .maybeSingle();

    if (!productError && product?.product_name) {
      finalProductName = product.product_name;
    } else {
      // Try to get from product_list_items
      const { data: productItems, error: itemsError } = await db
        .from('product_list_items')
        .select('product_name')
        .eq('added_by', pharmacyId)
        .or(`ndc.eq.${normalizedNdc},ndc.eq.${normalizedNdcForSearch}`)
        .limit(1);

      if (!itemsError && productItems && productItems.length > 0 && productItems[0]?.product_name) {
        finalProductName = productItems[0].product_name;
      } else {
        finalProductName = `Product ${normalizedNdc}`;
      }
    }
  }

  // Step 3: Get pricing data from return_reports
  // Join with uploaded_documents and reverse_distributors to get distributor name
  // IMPORTANT: Do NOT filter by pharmacy_id - we want ALL distributor prices
  // to find the best prices across all distributors
  const { data: returnReports, error: reportsError } = await db
    .from('return_reports')
    .select(`
      id,
      data,
      document_id,
      uploaded_documents (
        reverse_distributor_id,
        reverse_distributors (
          id,
          name
        )
      )
    `);

  console.log(`🏥 getDistributorSuggestionsByNdc: Fetching return_reports from ALL distributors (no pharmacy_id filter)`);

  if (reportsError) {
    throw new AppError(`Failed to fetch return reports: ${reportsError.message}`, 400);
  }

  // Step 4: Build pricing map for this NDC
  const distributorPricingMap: Record<
    string,
    Array<{
      pricePerUnit: number;
      creditAmount: number;
      quantity: number;
    }>
  > = {};

  // Process return reports to extract pricing for this NDC
  (returnReports || []).forEach((report: any) => {
    const data = report.data;
    // Get distributor name from joined reverse_distributors table, fallback to data field, then Unknown
    const distributorName = report.uploaded_documents?.reverse_distributors?.name || 
                           data?.reverseDistributor || 
                           data?.reverseDistributorInfo?.name ||
                           'Unknown Distributor';

    if (!distributorName || distributorName === 'Unknown Distributor') {
      return;
    }

    let items: any[] = [];

    if (data && typeof data === 'object') {
      if (Array.isArray(data.items)) {
        items = data.items;
      } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        items = [data.items];
      } else if (data.ndcCode || data.ndc) {
        items = [data];
      }
    }

    items.forEach((item: any) => {
      const ndcCode = item.ndcCode || item.ndc;

      if (!ndcCode) {
        return;
      }

      // Normalize NDC for comparison
      const normalizedItemNdc = String(ndcCode).replace(/-/g, '').trim();
      const itemNdc = String(ndcCode).trim();

      // Check if this item matches our NDC
      const isMatch =
        itemNdc === normalizedNdc ||
        normalizedItemNdc === normalizedNdcForSearch ||
        itemNdc === normalizedNdcForSearch ||
        normalizedItemNdc === normalizedNdc;

      if (!isMatch) {
        return;
      }

      const itemQuantity = Number(item.quantity) || 1;
      const creditAmount = Number(item.creditAmount) || 0;
      const pricePerUnit =
        Number(item.pricePerUnit) || (itemQuantity > 0 && creditAmount > 0 ? creditAmount / itemQuantity : 0);

      if (pricePerUnit > 0) {
        if (!distributorPricingMap[distributorName]) {
          distributorPricingMap[distributorName] = [];
        }

        distributorPricingMap[distributorName].push({
          pricePerUnit,
          creditAmount,
          quantity: itemQuantity,
        });
      }
    });
  });

  // Step 5: Calculate average price per unit for each distributor
  const distributorAverages: Array<{
    name: string;
    averagePricePerUnit: number;
    totalPrice: number;
    count: number;
  }> = [];

  Object.entries(distributorPricingMap).forEach(([distributorName, pricingData]) => {
    const totalPrice = pricingData.reduce((sum, p) => sum + p.pricePerUnit, 0);
    const count = pricingData.length;
    const averagePricePerUnit = count > 0 ? totalPrice / count : 0;

    if (averagePricePerUnit > 0) {
      distributorAverages.push({
        name: distributorName.trim(),
        averagePricePerUnit,
        totalPrice,
        count,
      });
    }
  });

  // Sort by average price (highest first = best return value)
  distributorAverages.sort((a, b) => b.averagePricePerUnit - a.averagePricePerUnit);

  // Step 6: Fetch distributor contact information
  const distributorNames = distributorAverages.map((d) => d.name);
  const distributorNameToIdMap: Record<string, string> = {};
  const distributorContactInfoMap: Record<string, {
    email?: string;
    phone?: string;
    location?: string;
  }> = {};

  if (distributorNames.length > 0) {
    const { data: distributors, error: distError } = await db
      .from('reverse_distributors')
      .select('id, name, contact_email, contact_phone, address')
      .in('name', distributorNames);

    if (!distError && distributors) {
      distributors.forEach((dist) => {
        distributorNameToIdMap[dist.name] = dist.id;

        // Format location from address
        let location: string | undefined;
        if (dist.address) {
          const addr = dist.address;
          const locationParts: string[] = [];

          if (addr.street) locationParts.push(addr.street);
          if (addr.city) locationParts.push(addr.city);
          if (addr.state) locationParts.push(addr.state);
          if (addr.zipCode) locationParts.push(addr.zipCode);
          if (addr.country) locationParts.push(addr.country);

          if (locationParts.length > 0) {
            location = locationParts.join(', ');
          }
        }

        distributorContactInfoMap[dist.name] = {
          email: dist.contact_email || undefined,
          phone: dist.contact_phone || undefined,
          location,
        };
      });
    }
  }

  // Step 7: Build distributor suggestions
  // First distributor (index 0) is recommended - it has the highest price (best value)
  const distributors: DistributorSuggestion[] = distributorAverages.map((dist, index) => {
    const totalEstimatedValue = dist.averagePricePerUnit * quantity;

    return {
      distributorName: dist.name,
      distributorId: distributorNameToIdMap[dist.name],
      distributorContact: distributorContactInfoMap[dist.name],
      pricePerUnit: Math.round(dist.averagePricePerUnit * 100) / 100,
      totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
      averagePricePerUnit: Math.round(dist.averagePricePerUnit * 100) / 100,
      available: true, // Assuming available if found in return reports
      recommended: index === 0, // First distributor (highest price) is recommended
    };
  });

  return {
    ndc: normalizedNdc,
    productName: finalProductName || `Product ${normalizedNdc}`,
    requestedQuantity: quantity,
    availableQuantity,
    hasEnoughQuantity,
    distributors,
    generatedAt: new Date().toISOString(),
  };
};

// Interface for multiple NDC suggestions request item
export interface NdcSuggestionRequestItem {
  ndc: string;
  product?: string;
  full: number;   // Full units to return
  partial: number; // Partial units to return
}

// Interface for distributor NDC product info
export interface DistributorNdcProduct {
  ndc: string;
  productName: string;
  full: number;
  partial: number;
  fullPricePerUnit: number | null;
  partialPricePerUnit: number | null;
  totalEstimatedValue: number;
}

// Interface for distributor with their accepted NDCs
// Interface for fee rates from reverse_distributors
export interface FeeRateInfo {
  percentage: number;
  reportDate: string;
}

export interface DistributorFeeRates {
  [periodDays: string]: FeeRateInfo;
}

export interface DistributorWithNdcs {
  distributorName: string;
  distributorId?: string;
  distributorContact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  feeRates?: DistributorFeeRates; // Fee rates from reverse_distributors table
  products: DistributorNdcProduct[];
  totalItems: number;
  totalEstimatedValue: number;
  ndcsCount: number;
}

// Interface for NDC without any distributor
export interface NdcWithoutDistributor {
  ndc: string;
  productName: string;
  full: number;
  partial: number;
  reason: string;
}

// Interface for multiple NDC suggestions response (grouped by distributor)
export interface MultipleNdcSuggestionResponse {
  distributors: DistributorWithNdcs[];
  ndcsWithoutDistributors: NdcWithoutDistributor[];
  totalItems: number;
  totalDistributors: number;
  totalEstimatedValue: number;
  generatedAt: string;
}

// Get distributor suggestions for multiple NDCs with full/partial quantities (grouped by distributor)
// Uses SQL RPC function - NO JS loops
export const getDistributorSuggestionsByMultipleNdcs = async (
  pharmacyId: string,
  items: NdcSuggestionRequestItem[]
): Promise<MultipleNdcSuggestionResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  if (!items || items.length === 0) {
    throw new AppError('At least one item with NDC and full/partial units is required', 400);
  }

  const db = supabaseAdmin;

  // Prepare items for RPC call
  const itemsJson = items.map(item => ({
    ndc: item.ndc.trim(),
    product: item.product || null,
    full: item.full || 0,
    partial: item.partial || 0,
  }));

  console.log('🚀 Calling get_distributor_suggestions RPC function...');
  
  const { data: rpcResult, error: rpcError } = await db.rpc('get_distributor_suggestions', {
    p_pharmacy_id: pharmacyId,
    p_items: itemsJson,
  });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError.message);
    
    // Check for specific error types
    if (rpcError.message?.includes("don't have this product")) {
      throw new AppError(rpcError.message, 400);
    }
    if (rpcError.message?.includes('At least one of full or partial must be greater than 0')) {
      throw new AppError(rpcError.message, 400);
    }
    if (rpcError.message?.includes('At least one item')) {
      throw new AppError(rpcError.message, 400);
    }
    
    throw new AppError(`Failed to get distributor suggestions: ${rpcError.message}`, 500);
  }

  if (!rpcResult) {
    throw new AppError('No data returned from distributor suggestions', 500);
  }

  console.log('✅ RPC function executed successfully');
  
  // Return the result directly - all processing done in SQL
  return {
    distributors: rpcResult.distributors || [],
    ndcsWithoutDistributors: rpcResult.ndcsWithoutDistributors || [],
    totalItems: rpcResult.totalItems || 0,
    totalDistributors: rpcResult.totalDistributors || 0,
    totalEstimatedValue: rpcResult.totalEstimatedValue || 0,
    generatedAt: rpcResult.generatedAt || new Date().toISOString(),
  };
};

// Interface for existing package info
export interface ExistingPackageInfo {
  id: string;
  packageNumber: string;
  totalItems: number;
  totalEstimatedValue: number;
  feeRate?: number;
  feeDuration?: number;
  createdAt: string;
}

// Interface for package suggestion with alreadyCreated flag
export interface PackageSuggestionWithStatus extends DistributorPackage {
  alreadyCreated: boolean;
  existingPackage?: ExistingPackageInfo; // Existing package info when alreadyCreated is true
  recommended: boolean; // true for the distributor with highest total value
}

// Interface for package suggestions response
export interface PackageSuggestionsResponse {
  packages: PackageSuggestionWithStatus[];
  totalProducts: number;
  totalPackages: number;
  totalEstimatedValue: number;
  generatedAt: string;
  summary: {
    productsWithPricing: number;
    productsWithoutPricing: number;
    distributorsUsed: number;
    packagesAlreadyCreated: number;
  };
}

// Interface for NDC input item
export interface NdcInputItem {
  ndc: string;
  productId?: string; // Product ID from product_list_items (optional)
  productName?: string; // Product name (optional)
  full?: number;
  partial?: number;
}

/**
 * Get package suggestions by NDC codes with alreadyCreated flag
 * Checks if a package has already been created with each distributor for the pharmacy
 */
export const getPackageSuggestionsByNdcs = async (
  pharmacyId: string,
  items: NdcInputItem[]
): Promise<PackageSuggestionsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  if (!items || items.length === 0) {
    return {
      packages: [],
      totalProducts: 0,
      totalPackages: 0,
      totalEstimatedValue: 0,
      generatedAt: new Date().toISOString(),
      summary: {
        productsWithPricing: 0,
        productsWithoutPricing: 0,
        distributorsUsed: 0,
        packagesAlreadyCreated: 0,
      },
    };
  }

  // Step 1: Normalize items - DO NOT deduplicate, treat each item separately
  const normalizedItems = items.map((item) => ({
    ndc: String(item.ndc).trim(),
    normalizedNdc: String(item.ndc).replace(/-/g, '').trim(),
    productId: item.productId || null,
    productName: item.productName || null,
    full: item.full || 0,
    partial: item.partial || 0,
  })).filter((item) => item.ndc.length > 0);

  if (normalizedItems.length === 0) {
    return {
      packages: [],
      totalProducts: 0,
      totalPackages: 0,
      totalEstimatedValue: 0,
      generatedAt: new Date().toISOString(),
      summary: {
        productsWithPricing: 0,
        productsWithoutPricing: 0,
        distributorsUsed: 0,
        packagesAlreadyCreated: 0,
      },
    };
  }

  const ndcs = normalizedItems.map((item) => item.ndc);

  // Step 2: Get product information from products table
  const { data: products, error: productsError } = await db
    .from('products')
    .select('ndc, product_name')
    .in('ndc', ndcs);

  // Create a map of NDC to product name
  const ndcToProductNameMap: Record<string, string> = {};
  if (!productsError && products) {
    products.forEach((product) => {
      ndcToProductNameMap[product.ndc] = product.product_name;
    });
  }

  // Step 3: Build unit type map for each NDC
  const ndcUnitTypeMap: Map<string, { needsFullPrice: boolean; needsPartialPrice: boolean }> = new Map();
  normalizedItems.forEach((item) => {
    const needsFullPrice = item.full > 0;
    const needsPartialPrice = item.partial > 0;
    ndcUnitTypeMap.set(item.normalizedNdc, { needsFullPrice, needsPartialPrice });
  });

  // Step 4: Fetch ALL return reports using pagination
  console.log(`📊 getPackageSuggestionsByNdcs: Fetching ALL return_reports using pagination...`);
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
        name
      )
    )
  `;

  const returnReports: any[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const batchQuery = db
      .from('return_reports')
      .select(selectFields)
      .range(offset, offset + batchSize - 1);

    const { data: batch, error: batchError } = await batchQuery;

    if (batchError) {
      throw new AppError(`Failed to fetch return reports: ${batchError.message}`, 400);
    }

    if (batch && batch.length > 0) {
      returnReports.push(...batch);
      offset += batchSize;
      console.log(`   ✅ Fetched ${returnReports.length} records so far...`);

      if (batch.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Total return_reports fetched: ${returnReports.length}`);

  // Sort by report_date (latest first)
  if (returnReports && returnReports.length > 0) {
    returnReports.sort((a: any, b: any) => {
      const dateA = a.uploaded_documents?.report_date || a.uploaded_documents?.uploaded_at || a.created_at;
      const dateB = b.uploaded_documents?.report_date || b.uploaded_documents?.uploaded_at || b.created_at;
      const dateAObj = dateA ? new Date(dateA) : new Date(0);
      const dateBObj = dateB ? new Date(dateB) : new Date(0);
      return dateBObj.getTime() - dateAObj.getTime();
    });
  }

  // Step 5: Build pricing map (NDC -> Distributor -> Best Price)
  const ndcPricingMap: Record<
    string,
    Array<{
      distributorName: string;
      pricePerUnit: number;
      creditAmount: number;
      quantity: number;
    }>
  > = {};

  // Track latest price per distributor-NDC combination
  const distributorNdcToLatestPriceMap: Record<string, number> = {};

  // Initialize map for all NDCs
  ndcs.forEach((ndc) => {
    ndcPricingMap[ndc] = [];
  });

  // Process return reports to extract pricing
  (returnReports || []).forEach((report: any) => {
    const data = report.data;
    const distributorName = (report.uploaded_documents?.reverse_distributors?.name ||
      data?.reverseDistributor ||
      data?.reverseDistributorInfo?.name ||
      'Unknown Distributor').trim();

    if (!distributorName || distributorName === 'Unknown Distributor') {
      return;
    }

    let reportItems: any[] = [];

    if (data && typeof data === 'object') {
      if (Array.isArray(data.items)) {
        reportItems = data.items;
      } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        reportItems = [data.items];
      } else if (data.ndcCode || data.ndc) {
        reportItems = [data];
      }
    }

    reportItems.forEach((item: any) => {
      const ndcCode = item.ndcCode || item.ndc;

      if (!ndcCode) {
        return;
      }

      const normalizedNdcCode = String(ndcCode).replace(/-/g, '').trim();

      // Find matching NDC from input list
      const matchingItem = normalizedItems.find((n) => {
        return (
          n.normalizedNdc === normalizedNdcCode ||
          String(n.ndc).trim() === String(ndcCode).trim()
        );
      });

      if (!matchingItem) {
        return;
      }

      const matchingNdc = matchingItem.ndc;

      // Get full and partial values from return report item
      const itemFull = Number(item.full) || 0;
      const itemPartial = Number(item.partial) || 0;

      // Filter records based on unit type requirements
      const unitTypeReq = ndcUnitTypeMap.get(matchingItem.normalizedNdc);

      if (unitTypeReq) {
        const { needsFullPrice, needsPartialPrice } = unitTypeReq;

        // If only full units requested, skip partial-only records
        if (needsFullPrice && !needsPartialPrice) {
          if (itemFull === 0 || itemPartial > 0) {
            return;
          }
        }

        // If only partial units requested, skip full-only records
        if (needsPartialPrice && !needsFullPrice) {
          if (itemPartial === 0 || itemFull > 0) {
            return;
          }
        }
      }

      const quantity = Number(item.quantity) || 1;
      const creditAmount = Number(item.creditAmount) || 0;
      const pricePerUnit =
        Number(item.pricePerUnit) || (quantity > 0 && creditAmount > 0 ? creditAmount / quantity : 0);

      if (pricePerUnit > 0) {
        const distributorNdcKey = `${distributorName}|${matchingNdc}`;
        if (!distributorNdcToLatestPriceMap[distributorNdcKey]) {
          distributorNdcToLatestPriceMap[distributorNdcKey] = pricePerUnit;
        }

        ndcPricingMap[matchingNdc].push({
          distributorName,
          pricePerUnit,
          creditAmount,
          quantity,
        });
      }
    });
  });

  // Step 6: Build pricing map for ALL distributors (not just the best one)
  // Map: NDC -> Array of { distributorName, pricePerUnit }
  const ndcToDistributorPricesMap: Record<string, Array<{ distributorName: string; pricePerUnit: number }>> = {};
  
  // Track which NDCs have pricing from any distributor
  const ndcsWithPricing = new Set<string>();

  normalizedItems.forEach((item) => {
    const ndc = item.ndc;
    const pricingData = ndcPricingMap[ndc] || [];

    if (pricingData.length === 0) {
      return;
    }

    // Group by distributor
    const distributorPrices: Record<string, { totalPrice: number; count: number }> = {};

    pricingData.forEach((pricing) => {
      const distName = (pricing.distributorName || 'Unknown Distributor').trim();
      if (!distributorPrices[distName]) {
        distributorPrices[distName] = { totalPrice: 0, count: 0 };
      }
      distributorPrices[distName].totalPrice += pricing.pricePerUnit;
      distributorPrices[distName].count += 1;
    });

    const distributorAverages: Array<{ distributorName: string; pricePerUnit: number }> = Object.entries(
      distributorPrices
    )
      .filter(([_, data]) => data.count > 0)
      .map(([name, data]) => {
        const distributorName = name.trim();
        const distributorNdcKey = `${distributorName}|${ndc}`;
        const latestPrice = distributorNdcToLatestPriceMap[distributorNdcKey];
        const pricePerUnit = latestPrice !== undefined ? latestPrice : data.totalPrice / data.count;
        return { distributorName, pricePerUnit };
      });

    if (distributorAverages.length === 0) {
      return;
    }

    // Store ALL distributors for this NDC (sorted by price descending)
    distributorAverages.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    ndcToDistributorPricesMap[ndc] = distributorAverages;
    ndcsWithPricing.add(ndc);
  });

  // Step 7: Build packages for ALL distributors (not just the best one)
  // Each distributor gets a package with all NDCs they have pricing for
  const allDistributorNames = new Set<string>();
  Object.values(ndcToDistributorPricesMap).forEach((prices) => {
    prices.forEach((p) => allDistributorNames.add(p.distributorName));
  });

  const distributorPackagesMap: Record<string, PackageProduct[]> = {};

  // For each distributor, build their package with all NDCs they support
  allDistributorNames.forEach((distributorName) => {
    distributorPackagesMap[distributorName] = [];

    normalizedItems.forEach((item) => {
      const ndc = item.ndc;
      const distributorPrices = ndcToDistributorPricesMap[ndc];

      if (!distributorPrices) {
        return;
      }

      // Find this distributor's price for this NDC
      const distributorPrice = distributorPrices.find((p) => p.distributorName === distributorName);

      if (!distributorPrice) {
        return; // This distributor doesn't have pricing for this NDC
      }

      const fullUnits = item.full;
      const partialUnits = item.partial;
      const totalUnits = fullUnits + partialUnits || 1;
      const pricePerUnit = distributorPrice.pricePerUnit;
      const totalValue = pricePerUnit * totalUnits;

      distributorPackagesMap[distributorName].push({
        ndc,
        productId: item.productId || undefined,
        productName: item.productName || ndcToProductNameMap[ndc] || `Product ${ndc}`,
        full: fullUnits,
        partial: partialUnits,
        pricePerUnit,
        totalValue,
      });
    });
  });

  // Remove distributors with no products
  Object.keys(distributorPackagesMap).forEach((distName) => {
    if (distributorPackagesMap[distName].length === 0) {
      delete distributorPackagesMap[distName];
    }
  });

  // Step 8: Fetch distributor contact information
  const distributorNames = Object.keys(distributorPackagesMap);
  const distributorNameToIdMap: Record<string, string> = {};
  const distributorContactInfoMap: Record<string, {
    email?: string;
    phone?: string;
    location?: string;
    feeRates?: DistributorFeeRates;
  }> = {};

  if (distributorNames.length > 0) {
    const { data: distributors, error: distError } = await db
      .from('reverse_distributors')
      .select('id, name, contact_email, contact_phone, address, fee_rates')
      .in('name', distributorNames);

    if (!distError && distributors) {
      distributors.forEach((dist) => {
        distributorNameToIdMap[dist.name] = dist.id;

        let location: string | undefined;
        if (dist.address) {
          const addr = dist.address;
          const locationParts: string[] = [];
          if (addr.street) locationParts.push(addr.street);
          if (addr.city) locationParts.push(addr.city);
          if (addr.state) locationParts.push(addr.state);
          if (addr.zipCode) locationParts.push(addr.zipCode);
          if (addr.country) locationParts.push(addr.country);
          if (locationParts.length > 0) {
            location = locationParts.join(', ');
          }
        }

        distributorContactInfoMap[dist.name] = {
          email: dist.contact_email || undefined,
          phone: dist.contact_phone || undefined,
          location,
          feeRates: (dist.fee_rates && typeof dist.fee_rates === 'object') ? dist.fee_rates as DistributorFeeRates : undefined,
        };
      });
    }
  }

  // Step 9: Check if packages have already been created with these distributors
  // IMPORTANT: Only consider packages that are NOT delivered (status = false)
  // If a package is delivered (status = true), it should not count as "alreadyCreated"
  console.log(`📦 Checking existing custom packages for pharmacy ${pharmacyId}...`);
  const existingDistributorNames = new Set<string>();
  const existingPackagesMap: Record<string, ExistingPackageInfo> = {};

  if (distributorNames.length > 0) {
    const { data: existingPackages, error: existingError } = await db
      .from('custom_packages')
      .select('id, package_number, distributor_name, distributor_id, status, total_items, total_estimated_value, fee_rate, fee_duration, created_at')
      .eq('pharmacy_id', pharmacyId)
      .eq('status', false) // Only consider non-delivered packages
      .in('distributor_name', distributorNames);

    if (!existingError && existingPackages) {
      existingPackages.forEach((pkg: any) => {
        existingDistributorNames.add(pkg.distributor_name);
        // Store the existing package info for this distributor
        existingPackagesMap[pkg.distributor_name] = {
          id: pkg.id,
          packageNumber: pkg.package_number,
          totalItems: pkg.total_items,
          totalEstimatedValue: pkg.total_estimated_value,
          feeRate: pkg.fee_rate || undefined,
          feeDuration: pkg.fee_duration || undefined,
          createdAt: pkg.created_at,
        };
      });
      console.log(`📦 Found ${existingPackages.length} existing non-delivered packages with matching distributors`);
    }
  }

  // Step 10: Build package suggestions with alreadyCreated flag and existing package info
  const packagesUnsorted: PackageSuggestionWithStatus[] = Object.entries(distributorPackagesMap).map(
    ([distributorName, packageProducts]) => {
      const totalItems = packageProducts.reduce((sum, p) => sum + p.full + p.partial, 0);
      const totalEstimatedValue = packageProducts.reduce((sum, p) => sum + p.totalValue, 0);
      const averagePricePerUnit = totalItems > 0 ? totalEstimatedValue / totalItems : 0;
      const isAlreadyCreated = existingDistributorNames.has(distributorName);

      return {
        distributorName,
        distributorId: distributorNameToIdMap[distributorName],
        distributorContact: distributorContactInfoMap[distributorName],
        products: packageProducts,
        totalItems,
        totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
        averagePricePerUnit: Math.round(averagePricePerUnit * 100) / 100,
        alreadyCreated: isAlreadyCreated,
        existingPackage: isAlreadyCreated ? existingPackagesMap[distributorName] : undefined,
        recommended: false, // Will be set after sorting
      };
    }
  );

  // Sort packages by total estimated value (highest first)
  packagesUnsorted.sort((a, b) => b.totalEstimatedValue - a.totalEstimatedValue);

  // Mark the first package (highest value) as recommended
  const packages = packagesUnsorted.map((pkg, index) => ({
    ...pkg,
    recommended: index === 0, // First package (highest total value) is recommended
  }));

  // Calculate summary statistics
  const productsWithPricing = ndcsWithPricing.size;
  const productsWithoutPricing = normalizedItems.length - productsWithPricing;
  const totalEstimatedValue = packages.reduce((sum, pkg) => sum + pkg.totalEstimatedValue, 0);
  const packagesAlreadyCreated = packages.filter((pkg) => pkg.alreadyCreated).length;

  return {
    packages,
    totalProducts: normalizedItems.length,
    totalPackages: packages.length,
    totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
    generatedAt: new Date().toISOString(),
    summary: {
      productsWithPricing,
      productsWithoutPricing,
      distributorsUsed: packages.length,
      packagesAlreadyCreated,
    },
  };
};

// Interface for distributor package suggestion input item
export interface DistributorPackageItem {
  ndc: string;
  productId?: string;
  productName?: string;
  full?: number;
  partial?: number;
}

// Interface for distributor package suggestion response
export interface DistributorPackageSuggestionResponse {
  packages: PackageSuggestionWithStatus[];
  totalProducts: number;
  totalPackages: number;
  totalEstimatedValue: number;
  generatedAt: string;
  summary: {
    productsWithPricing: number;
    productsWithoutPricing: number;
    distributorsUsed: number;
    packagesAlreadyCreated: number;
  };
}

// Get package suggestion for a specific distributor using RPC function
export const getDistributorPackageSuggestion = async (
  pharmacyId: string,
  distributorId: string,
  items: DistributorPackageItem[]
): Promise<DistributorPackageSuggestionResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_distributor_package_suggestion', {
    p_pharmacy_id: pharmacyId,
    p_distributor_id: distributorId,
    p_items: items
  });

  if (error) {
    throw new AppError(`Failed to get distributor package suggestion: ${error.message}`, 400);
  }

  if (!data || !data.success) {
    throw new AppError(data?.error || 'Failed to get distributor package suggestion', 400);
  }

  return data.data as DistributorPackageSuggestionResponse;
};

