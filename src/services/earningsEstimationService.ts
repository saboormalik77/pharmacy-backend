import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// Interface for individual NDC comparison data
export interface NdcComparisonData {
  ndcCode: string;
  productName: string;
  quantity: number;
  full: number;
  partial: number;
  actualEarned: number; // creditAmount from their report
  bestDistributor: {
    id: string;
    name: string;
    pricePerUnit: number;
    potentialEarnings: number;
  };
  potentialAdditionalEarnings: number; // best - current
  percentageDifference: number; // Percentage increase they could have gotten
}

// Interface for chart data by period
export interface PeriodChartData {
  period: string; // Format: "YYYY-MM" for monthly, "YYYY" for yearly
  label: string; // Human-readable label (e.g., "January 2025")
  actualEarnings: number; // What they actually earned (sum of creditAmount)
  potentialEarnings: number; // What they could have earned with best prices
  difference: number; // potentialEarnings - actualEarnings
}

// Interface for graph-friendly response
export interface EarningsEstimationResponse {
  summary: {
    totalActualEarnings: number;
    totalPotentialEarnings: number;
    totalMissedEarnings: number;
    optimizationScore: number; // 0-100, how well they optimized (100 = perfect choices)
    isAlreadyOptimal: boolean; // true if they already earned the best
    periodType: 'monthly' | 'yearly';
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  chartData: PeriodChartData[]; // For line/bar chart showing earnings over time
  topMissedOpportunities: NdcComparisonData[]; // Top 10 NDCs where they could have earned more
}

/**
 * Get earnings estimation analysis for a pharmacy
 * Uses PostgreSQL function for all aggregation - no custom JS logic
 * 
 * Logic:
 * 1. Build pricing database from ALL return reports (to find best prices per NDC)
 * 2. Get pharmacy's return reports within date range
 * 3. Compare actual earnings vs potential earnings with best prices
 * 4. Group by month/year for chart data
 * 5. Get top 10 missed opportunities by NDC
 */
export const getEarningsEstimation = async (
  pharmacyId: string,
  periodType: 'monthly' | 'yearly' = 'monthly',
  periods: number = 12
): Promise<EarningsEstimationResponse> => {
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

  console.log(`📊 Fetching earnings estimation via RPC for pharmacy ${pharmacyId} from ${startDateStr} to ${endDateStr} (${periodType}, ${periods} periods)`);

  // Call PostgreSQL function - all aggregation done in database
  const { data, error } = await db.rpc('get_earnings_estimation', {
    p_pharmacy_id: pharmacyId,
    p_period_type: periodType,
    p_start_date: startDateStr,
    p_end_date: endDateStr
  });

  if (error) {
    throw new AppError(`Failed to fetch earnings estimation: ${error.message}`, 400);
  }

  // Return database result directly - response structure matches interface
  return {
    summary: {
      totalActualEarnings: data.summary?.totalActualEarnings || 0,
      totalPotentialEarnings: data.summary?.totalPotentialEarnings || 0,
      totalMissedEarnings: data.summary?.totalMissedEarnings || 0,
      optimizationScore: data.summary?.optimizationScore || 100,
      isAlreadyOptimal: data.summary?.isAlreadyOptimal ?? true,
      periodType,
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    },
    chartData: data.chartData || [],
    topMissedOpportunities: data.topMissedOpportunities || [],
  };
};
