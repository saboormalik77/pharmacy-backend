import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { formatNonReturnableReason } from '../constants/nonReturnableReasons';
// import { getOptimizationRecommendations } from './optimizationService';

export interface DashboardSummary {
  totalPharmacyAddedProducts: number;
  topDistributorCount: number;
  totalPackages: number;
  deliveredPackages: number;
  nonDeliveredPackages: number;
  // Commented out fields - keeping for reference
  // totalDocuments: number;
  // documentsThisMonth: number;
  // lastUpload: string | null;
  // totalDistributors: number;
  // totalNDCs: number;
  // totalDataPoints: number;
  // priceVariance: number;
  // potentialSavings: number;
  // activeInventory: number;
  // totalReturns: number;
  // pendingReturns: number;
  // completedReturns: number;
  // totalEstimatedCredits: number;
  // expiringItems: number;
}

export const getDashboardSummary = async (pharmacyId: string): Promise<DashboardSummary> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // Get total pharmacy added products (from product_list_items where added_by = pharmacyId)
  const { count: pharmacyAddedProductsCount } = await db
    .from('product_list_items')
    .select('*', { count: 'exact', head: true })
    .eq('added_by', pharmacyId);

  // Get top distributor count - count all active distributors
  // This matches the getTopDistributors API which returns all active distributors
  // regardless of whether they have documents with this pharmacy
  const { count: topDistributorCount, error: distError } = await db
    .from('reverse_distributors')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (distError) {
    throw new AppError(`Failed to fetch distributors: ${distError.message}`, 400);
  }

  // Get package statistics using the same logic as /api/optimization/custom-packages
  // Get count of packages with status true (delivered)
  const { count: deliveredPackagesCount, error: deliveredCountError } = await db
    .from('custom_packages')
    .select('*', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId)
    .eq('status', true);

  if (deliveredCountError) {
    throw new AppError(`Failed to fetch delivered packages count: ${deliveredCountError.message}`, 400);
  }

  // Get count of packages with status false (non-delivered)
  const { count: nonDeliveredPackagesCount, error: nonDeliveredCountError } = await db
    .from('custom_packages')
    .select('*', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId)
    .eq('status', false);

  if (nonDeliveredCountError) {
    throw new AppError(`Failed to fetch non-delivered packages count: ${nonDeliveredCountError.message}`, 400);
  }

  // Calculate total packages (delivered + non-delivered)
  const totalPackages = (deliveredPackagesCount || 0) + (nonDeliveredPackagesCount || 0);

  // Commented out - old logic for reference
  // // Get total documents
  // const { count: documentsCount } = await db
  //   .from('uploaded_documents')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('pharmacy_id', pharmacyId);

  // // Get documents this month
  // const now = new Date();
  // const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // const { count: documentsThisMonthCount } = await db
  //   .from('uploaded_documents')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('pharmacy_id', pharmacyId)
  //   .gte('uploaded_at', firstDayOfMonth.toISOString());

  // // Get last upload date
  // const { data: lastDocument } = await db
  //   .from('uploaded_documents')
  //   .select('uploaded_at')
  //   .eq('pharmacy_id', pharmacyId)
  //   .order('uploaded_at', { ascending: false })
  //   .limit(1)
  //   .maybeSingle();

  // const lastUpload = lastDocument?.uploaded_at || null;

  // // Get total unique distributors from documents
  // const { data: distributorsData } = await db
  //   .from('uploaded_documents')
  //   .select('reverse_distributor_id')
  //   .eq('pharmacy_id', pharmacyId)
  //   .not('reverse_distributor_id', 'is', null);
  
  // const uniqueDistributors = new Set((distributorsData || []).map(d => d.reverse_distributor_id)).size;

  // // Get total unique NDCs from return_reports (where actual NDC data is stored)
  // const { data: returnReportsData } = await db
  //   .from('return_reports')
  //   .select('data')
  //   .eq('pharmacy_id', pharmacyId);
  
  // // Extract unique NDCs from return_reports data JSONB field
  // const uniqueNDCsSet = new Set<string>();
  // (returnReportsData || []).forEach((report: any) => {
  //   const data = report.data;
  //   // Handle different data structures
  //   if (data?.ndcCode) {
  //     uniqueNDCsSet.add(String(data.ndcCode).trim());
  //   } else if (data?.ndc) {
  //     uniqueNDCsSet.add(String(data.ndc).trim());
  //   }
  // });
  
  // const uniqueNDCs = uniqueNDCsSet.size;

  // // Get total inventory items
  // const { count: inventoryCount } = await db
  //   .from('inventory_items')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('pharmacy_id', pharmacyId);

  // // Get expiring items (status = 'expiring_soon')
  // const { count: expiringCount } = await db
  //   .from('inventory_items')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('pharmacy_id', pharmacyId)
  //   .eq('status', 'expiring_soon');

  // // Get total returns
  // const { count: returnsCount } = await db
  //   .from('returns')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('pharmacy_id', pharmacyId);

  // // Get pending returns
  // const { count: pendingReturnsCount } = await db
  //   .from('returns')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('pharmacy_id', pharmacyId)
  //   .in('status', ['draft', 'ready_to_ship']);

  // // Get completed returns
  // const { count: completedReturnsCount } = await db
  //   .from('returns')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('pharmacy_id', pharmacyId)
  //   .eq('status', 'completed');

  // // Get total estimated credits from all returns
  // const { data: returnsData } = await db
  //   .from('returns')
  //   .select('total_estimated_credit')
  //   .eq('pharmacy_id', pharmacyId);
  
  // const totalEstimatedCredits = (returnsData || []).reduce((sum, r) => sum + (r.total_estimated_credit || 0), 0);

  // // Calculate price variance from return_reports
  // // Get all pricePerUnit values from return_reports
  // const allPrices: number[] = [];
  // (returnReportsData || []).forEach((report: any) => {
  //   const data = report.data;
  //   if (data?.pricePerUnit && typeof data.pricePerUnit === 'number' && data.pricePerUnit > 0) {
  //     allPrices.push(data.pricePerUnit);
  //   }
  // });

  // let priceVariance = 0;
  // if (allPrices.length > 1) {
  //   // Calculate variance: average of squared differences from mean
  //   const mean = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
  //   const squaredDiffs = allPrices.map(p => Math.pow(p - mean, 2));
  //   const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / allPrices.length;
  //   // Price variance as percentage of mean
  //   priceVariance = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;
  // }

  // // Calculate potential savings using the same logic as optimization API
  // // Get totalPotentialSavings from optimization recommendations
  // let potentialSavings = 0;
  // try {
  //   const optimizationData = await getOptimizationRecommendations(pharmacyId);
  //   potentialSavings = optimizationData.totalPotentialSavings;
  // } catch (error: any) {
  //   // If optimization fails, set to 0 (don't break dashboard)
  //   console.warn('⚠️ Failed to get optimization data for potential savings:', error.message);
  //   potentialSavings = 0;
  // }

  return {
    totalPharmacyAddedProducts: pharmacyAddedProductsCount || 0,
    topDistributorCount: topDistributorCount || 0,
    totalPackages: totalPackages,
    deliveredPackages: deliveredPackagesCount || 0,
    nonDeliveredPackages: nonDeliveredPackagesCount || 0,
    // Commented out - old return values for reference
    // totalDocuments: documentsCount || 0,
    // documentsThisMonth: documentsThisMonthCount || 0,
    // lastUpload: lastUpload ? new Date(lastUpload).toISOString() : null,
    // totalDistributors: uniqueDistributors,
    // totalNDCs: uniqueNDCs,
    // totalDataPoints: documentsCount || 0, // Total documents = data points
    // priceVariance: Math.round(priceVariance * 100) / 100, // Round to 2 decimal places
    // potentialSavings: Math.round(potentialSavings * 100) / 100, // Round to 2 decimal places
    // activeInventory: inventoryCount || 0,
    // totalReturns: returnsCount || 0,
    // pendingReturns: pendingReturnsCount || 0,
    // completedReturns: completedReturnsCount || 0,
    // totalEstimatedCredits: Math.round(totalEstimatedCredits * 100) / 100,
    // expiringItems: expiringCount || 0,
  };
};

// Interface for return stats response
export interface ReturnStatsResponse {
  totalReturns: number; // Total returns for this pharmacy (created by pharmacy + created by processor for pharmacy)
  totalPharmacyCreatedReturns: number; // Returns created by pharmacy itself (processor_id is NULL)
  totalProcessorHandledReturns: number; // Returns created by processor on behalf of pharmacy (processor_id is NOT NULL)
  totalReturnValue: number; // Sum of all returnable + non-returnable values
  totalCredits: number; // Sum of totalCreditReceived from pharmacy_payments table (matches Credits tab)
}

/**
 * Get return statistics for a specific pharmacy
 * - Total returns: all returns for this pharmacy (created by pharmacy itself + created by processor for pharmacy)
 * - Pharmacy created returns: returns created directly by the pharmacy
 * - Processor created returns: returns created by a processor on behalf of the pharmacy
 * - Total return value: sum of all returnable and non-returnable values
 * - Total credits: sum of totalCreditReceived from pharmacy_payments table (same logic as Credits tab)
 */
export const getReturnStats = async (pharmacyId: string): Promise<ReturnStatsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // Get count of returns created by this pharmacy (where processor is NULL - pharmacy created it themselves)
  const { count: pharmacyCreatedReturns } = await db
    .from('return_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId)
    .is('processor_id', null);

  // Get count of returns created by a processor for this pharmacy (where processor is NOT NULL)
  const { count: processorCreatedReturns } = await db
    .from('return_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId)
    .not('processor_id', 'is', null);

  // Calculate total returns for this pharmacy (pharmacy created + processor created)
  const totalReturns = (pharmacyCreatedReturns || 0) + (processorCreatedReturns || 0);

  // Get sum of all return values (returnable + non-returnable) for pharmacy-created returns
  const { data: returnValuesData, error: returnValuesError } = await db
    .from('return_transactions')
    .select('total_returnable_value, total_non_returnable_value')
    .eq('pharmacy_id', pharmacyId);

  if (returnValuesError) {
    throw new AppError(`Failed to fetch return values: ${returnValuesError.message}`, 400);
  }

  // Calculate total return value
  const totalReturnValue = (returnValuesData || []).reduce((sum, rt) => {
    return sum + (Number(rt.total_returnable_value) || 0) + (Number(rt.total_non_returnable_value) || 0);
  }, 0);

  // Get sum of received credits for this pharmacy's returns
  // Use the same logic as the Credits tab - sum totalCreditReceived from pharmacy_payments table
  const { data: paymentsData, error: paymentsError } = await db
    .from('pharmacy_payments')
    .select('total_credit_received')
    .eq('pharmacy_id', pharmacyId);

  if (paymentsError) {
    console.warn('⚠️ Failed to fetch pharmacy payments data:', paymentsError.message);
  }

  const totalCredits = (paymentsData || []).reduce((sum, p) => sum + (Number(p.total_credit_received) || 0), 0);

  return {
    totalReturns,
    totalPharmacyCreatedReturns: pharmacyCreatedReturns || 0,
    totalProcessorHandledReturns: processorCreatedReturns || 0,
    totalReturnValue: Math.round(totalReturnValue * 100) / 100, // Round to 2 decimal places
    totalCredits: Math.round(totalCredits * 100) / 100, // Round to 2 decimal places
  };
};

// Interface for returns list item (dropdown)
export interface ReturnListItem {
  id: string;
  licensePlate: string;
  createdAt: string;
  status: string;
  totalReturnableValue: number;
  totalNonReturnableValue: number;
}

// Interface for return detail response (credit summary + product value breakdown)
export interface ReturnDetailResponse {
  returnTransaction: {
    id: string;
    licensePlate: string;
    status: string;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    createdAt: string;
  };
  creditSummary: {
    fcrOneCheck: {
      expected: number;
      received: number;
    };
    manufacturerDirect: {
      expected: number;
      received: number;
    };
    totalExpected: number;
    totalReceived: number;
  };
  productValueBreakdown: {
    returnable: number;
    nonReturnable: number;
  };
  nonReturnableReasons: Array<{
    reason: string;
    value: number;
  }>;
  productValuesOverTime: Array<{
    date: string;
    returnableValue: number;
    nonReturnableValue: number;
  }>;
}

/**
 * Map DB / RPC row to ReturnListItem (camelCase for API).
 */
function mapReturnListRows(rows: any[] | null | undefined): ReturnListItem[] {
  return (rows || []).map((rt: any) => ({
    id: rt.id,
    licensePlate: rt.license_plate ?? rt.licensePlate,
    createdAt: rt.created_at ?? rt.createdAt,
    status: rt.status,
    totalReturnableValue: Number(rt.total_returnable_value ?? rt.totalReturnableValue) || 0,
    totalNonReturnableValue: Number(rt.total_non_returnable_value ?? rt.totalNonReturnableValue) || 0,
  }));
}

/**
 * Same eligibility rules as list_pharmacy_dashboard_returns RPC, implemented in JS
 * when the RPC is not deployed yet.
 */
async function getReturnsListFilteredFallback(pharmacyId: string): Promise<ReturnListItem[]> {
  const db = supabaseAdmin!;

  const { data: rows, error } = await db
    .from('return_transactions')
    .select('id, license_plate, created_at, status, total_returnable_value, total_non_returnable_value')
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch returns list: ${error.message}`, 400);
  }
  if (!rows?.length) return [];

  const txIds = rows.map((r: any) => r.id);

  const { data: items, error: itemsErr } = await db
    .from('return_transaction_items')
    .select('id, transaction_id, return_status, non_returnable_reason')
    .in('transaction_id', txIds);

  if (itemsErr || !items?.length) {
    return [];
  }

  const itemIds = items.map((i: any) => i.id).filter(Boolean);
  const itemsWithAsk = new Set<string>();

  const chunkSize = 300;
  for (let i = 0; i < itemIds.length; i += chunkSize) {
    const chunk = itemIds.slice(i, i + chunkSize);
    const { data: dmiChunk, error: dmiErr } = await db
      .from('debit_memo_items')
      .select('transaction_item_id')
      .in('transaction_item_id', chunk)
      .not('ask_price', 'is', null);

    if (dmiErr) {
      console.warn('getReturnsList fallback debit_memo_items query failed:', dmiErr.message);
      continue;
    }
    (dmiChunk || []).forEach((d: any) => {
      if (d.transaction_item_id) itemsWithAsk.add(d.transaction_item_id);
    });
  }

  const txHasDebitAsk = new Set<string>();
  const txBadNonReturnableReason = new Set<string>();

  for (const it of items as any[]) {
    if (itemsWithAsk.has(it.id)) {
      txHasDebitAsk.add(it.transaction_id);
    }
    if (
      it.return_status === 'non_returnable' &&
      (!it.non_returnable_reason || String(it.non_returnable_reason).trim() === '')
    ) {
      txBadNonReturnableReason.add(it.transaction_id);
    }
  }

  const filtered = rows.filter(
    (r: any) => txHasDebitAsk.has(r.id) && !txBadNonReturnableReason.has(r.id)
  );
  return mapReturnListRows(filtered);
}

/**
 * Returns eligible for pharmacy dashboard dropdown:
 * - At least one debit_memo_item with ask_price for this return's line items
 * - No non_returnable line item missing non_returnable_reason
 */
export const getReturnsList = async (pharmacyId: string): Promise<ReturnListItem[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('list_pharmacy_dashboard_returns', {
    p_pharmacy_id: pharmacyId,
  });

  if (!rpcError && rpcData != null) {
    let arr: any[] = [];
    if (Array.isArray(rpcData)) {
      arr = rpcData;
    } else if (typeof rpcData === 'string') {
      try {
        arr = JSON.parse(rpcData);
      } catch {
        arr = [];
      }
    } else if (typeof rpcData === 'object') {
      arr = Object.values(rpcData as object);
    }
    if (Array.isArray(arr)) {
      return arr.map((rt: any) => ({
        id: rt.id,
        licensePlate: rt.licensePlate ?? rt.license_plate,
        createdAt: rt.createdAt ?? rt.created_at,
        status: rt.status,
        totalReturnableValue: Number(rt.totalReturnableValue ?? rt.total_returnable_value) || 0,
        totalNonReturnableValue: Number(rt.totalNonReturnableValue ?? rt.total_non_returnable_value) || 0,
      }));
    }
  }

  if (rpcError) {
    console.warn(
      'list_pharmacy_dashboard_returns RPC unavailable (run migration 20260515_list_pharmacy_dashboard_returns.sql); using JS fallback:',
      rpcError.message
    );
  }

  return getReturnsListFilteredFallback(pharmacyId);
};

/**
 * Get detailed data for a specific return transaction:
 * - Credit summary (FCR OneCheck vs Manufacturer Direct from pharmacy_payments)
 * - Product value breakdown (returnable vs non-returnable)
 * - Non-returnable reasons breakdown
 * - Product values over time (all returns for this pharmacy)
 */
export const getReturnDetail = async (pharmacyId: string, returnId: string): Promise<ReturnDetailResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // 1. Get the return transaction
  const { data: rtData, error: rtError } = await db
    .from('return_transactions')
    .select('id, license_plate, status, total_items, total_returnable_value, total_non_returnable_value, created_at')
    .eq('id', returnId)
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (rtError || !rtData) {
    throw new AppError('Return transaction not found', 404);
  }

  // 2. Get items for non-returnable reasons breakdown
  const { data: items, error: itemsError } = await db
    .from('return_transaction_items')
    .select('return_status, non_returnable_reason, estimated_value')
    .eq('transaction_id', returnId);

  if (itemsError) {
    throw new AppError(`Failed to fetch return items: ${itemsError.message}`, 400);
  }

  // Calculate non-returnable reasons using the canonical label lookup
  const reasonMap: Record<string, number> = {};
  (items || []).forEach((item: any) => {
    if (item.return_status === 'non_returnable') {
      const reasonLabel = formatNonReturnableReason(item.non_returnable_reason) || 'Other';
      reasonMap[reasonLabel] = (reasonMap[reasonLabel] || 0) + (Number(item.estimated_value) || 0);
    }
  });

  const nonReturnableReasons = Object.entries(reasonMap).map(([reason, value]) => ({
    reason,
    value: Math.round(value * 100) / 100,
  }));

  // 3. Get expected (ask_price) and received (received_price) values from debit_memo_items
  //    for this specific return transaction
  const { data: creditData, error: creditError } = await db.rpc('get_return_credit_summary', {
    p_return_id: returnId,
  });

  let totalExpected = 0;
  let totalReceived = 0;

  if (creditError) {
    // Fallback: try raw query via return_transaction_items -> debit_memo_items
    console.warn('RPC get_return_credit_summary failed, trying fallback query:', creditError.message);
    
    // Get return_transaction_items for this return
    const { data: rtiData, error: rtiError } = await db
      .from('return_transaction_items')
      .select('id')
      .eq('transaction_id', returnId);

    if (!rtiError && rtiData && rtiData.length > 0) {
      const rtiIds = rtiData.map((rti: any) => rti.id);
      
      // Get debit_memo_items for these transaction items
      const { data: dmiData, error: dmiError } = await db
        .from('debit_memo_items')
        .select('ask_price, received_price')
        .in('transaction_item_id', rtiIds);

      if (!dmiError && dmiData) {
        dmiData.forEach((dmi: any) => {
          totalExpected += Number(dmi.ask_price) || 0;
          totalReceived += Number(dmi.received_price) || 0;
        });
      }
    }
  } else if (creditData) {
    // RPC returns { total_ask, total_received }
    totalExpected = Number(creditData.total_ask) || 0;
    totalReceived = Number(creditData.total_received) || 0;
  }

  // 3b. Get pharmacy_payments for FCR vs Manufacturer Direct breakdown ratio
  const { data: paymentsData, error: paymentsError } = await db
    .from('pharmacy_payments')
    .select('included_credit_amount, direct_credit_amount')
    .eq('pharmacy_id', pharmacyId);

  if (paymentsError) {
    console.warn('Failed to fetch pharmacy payments:', paymentsError.message);
  }

  let fcrReceivedRatio = 0;
  let manufacturerDirectReceivedRatio = 0;

  (paymentsData || []).forEach((p: any) => {
    fcrReceivedRatio += Number(p.included_credit_amount) || 0;
    manufacturerDirectReceivedRatio += Number(p.direct_credit_amount) || 0;
  });

  const totalReturnableValue = Number(rtData.total_returnable_value) || 0;
  const totalNonReturnableValue = Number(rtData.total_non_returnable_value) || 0;

  // Split expected and received between FCR and Manufacturer Direct based on historical ratio
  const totalRatio = fcrReceivedRatio + manufacturerDirectReceivedRatio;
  const fcrRatio = totalRatio > 0 ? fcrReceivedRatio / totalRatio : 0.72; // Default 72% FCR if no data
  
  const fcrExpected = Math.round(totalExpected * fcrRatio * 100) / 100;
  const manufacturerDirectExpected = Math.round((totalExpected - fcrExpected) * 100) / 100;
  const fcrReceived = Math.round(totalReceived * fcrRatio * 100) / 100;
  const manufacturerDirectReceived = Math.round((totalReceived - fcrReceived) * 100) / 100;

  // 4. Get product values over time (all returns for this pharmacy, ordered by date)
  const { data: allReturns, error: allReturnsError } = await db
    .from('return_transactions')
    .select('created_at, total_returnable_value, total_non_returnable_value')
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: true });

  if (allReturnsError) {
    console.warn('Failed to fetch all returns for timeline:', allReturnsError.message);
  }

  const productValuesOverTime = (allReturns || []).map((r: any) => ({
    date: new Date(r.created_at).toISOString().split('T')[0],
    returnableValue: Number(r.total_returnable_value) || 0,
    nonReturnableValue: Number(r.total_non_returnable_value) || 0,
  }));

  return {
    returnTransaction: {
      id: rtData.id,
      licensePlate: rtData.license_plate,
      status: rtData.status,
      totalItems: rtData.total_items,
      totalReturnableValue,
      totalNonReturnableValue,
      createdAt: rtData.created_at,
    },
    creditSummary: {
      fcrOneCheck: {
        expected: fcrExpected,
        received: fcrReceived,
      },
      manufacturerDirect: {
        expected: manufacturerDirectExpected,
        received: manufacturerDirectReceived,
      },
      totalExpected: Math.round(totalExpected * 100) / 100,
      totalReceived: Math.round(totalReceived * 100) / 100,
    },
    productValueBreakdown: {
      returnable: totalReturnableValue,
      nonReturnable: totalNonReturnableValue,
    },
    nonReturnableReasons,
    productValuesOverTime,
  };
};

// Interface for period earnings data point (monthly or yearly)
export interface PeriodEarnings {
  period: string; // Format: "YYYY-MM" for monthly, "YYYY" for yearly
  label: string; // Human-readable label (e.g., "December 2025" or "2025")
  earnings: number;
  documentsCount: number;
}

// Interface for earnings by distributor
export interface DistributorEarnings {
  distributorId: string;
  distributorName: string;
  totalEarnings: number;
  documentsCount: number;
}

// Interface for historical earnings response
export interface HistoricalEarningsResponse {
  periodEarnings: PeriodEarnings[];
  totalEarnings: number;
  averagePeriodEarnings: number;
  totalDocuments: number;
  byDistributor: DistributorEarnings[];
  period: {
    startDate: string;
    endDate: string;
    type: 'monthly' | 'yearly';
    periods: number;
  };
}

/**
 * Get historical earnings for a pharmacy grouped by month or year
 * Uses PostgreSQL function for all aggregation - no custom JS logic
 * Data comes from uploaded_documents.total_credit_amount grouped by report_date
 */
export const getHistoricalEarnings = async (
  pharmacyId: string,
  periodType: 'monthly' | 'yearly' = 'monthly',
  periods: number = 12
): Promise<HistoricalEarningsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // Calculate date range based on period type
  const now = new Date();
  let startDateStr: string;
  let endDateStr: string;
  
  if (periodType === 'yearly') {
    const startYear = now.getFullYear() - periods;
    const endYear = now.getFullYear();
    startDateStr = `${startYear}-01-01`;
    endDateStr = `${endYear}-12-31`;
  } else {
    const startYear = now.getFullYear();
    const startMonth = now.getMonth() - periods;
    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDateStr = (d: Date): string => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    
    startDateStr = formatDateStr(startDate);
    endDateStr = formatDateStr(endDate);
  }

  console.log(`📊 Fetching historical earnings via RPC for pharmacy ${pharmacyId} from ${startDateStr} to ${endDateStr} (${periodType}, ${periods} periods)`);

  // Call PostgreSQL function - all aggregation done in database
  const { data, error } = await db.rpc('get_historical_earnings', {
    p_pharmacy_id: pharmacyId,
    p_period_type: periodType,
    p_start_date: startDateStr,
    p_end_date: endDateStr
  });

  if (error) {
    throw new AppError(`Failed to fetch historical earnings: ${error.message}`, 400);
  }

  // Return database result directly - response structure matches interface
  return {
    periodEarnings: data.periodEarnings || [],
    totalEarnings: data.totalEarnings || 0,
    averagePeriodEarnings: data.averagePeriodEarnings || 0,
    totalDocuments: data.totalDocuments || 0,
    byDistributor: data.byDistributor || [],
    period: {
      startDate: startDateStr,
      endDate: endDateStr,
      type: periodType,
      periods,
    },
  };
};

