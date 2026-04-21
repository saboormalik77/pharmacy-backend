import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// Interface for stat with change
export interface StatWithChange {
  value: number;
  change: number;
  changeLabel: string;
}

// Interface for pharmacy in list
export interface PharmacyListItem {
  id: string;
  name: string;
}

// Interface for returns trend data point
export interface ReturnsTrendDataPoint {
  period: string;
  label: string;
  value: number;
  documentsCount: number;
}

// Interface for period info
export interface PeriodInfo {
  type: 'monthly' | 'yearly';
  periods: number;
  startDate: string;
  endDate: string;
  pharmacyId: string | null;
}

// Interface for admin dashboard response
export interface AdminDashboardResponse {
  stats: {
    totalPharmacies: StatWithChange;
    activeDistributors: StatWithChange;
    returnsValue: StatWithChange;
  };
  pharmacies: PharmacyListItem[];
  returnsValueTrend: ReturnsTrendDataPoint[];
  period: PeriodInfo;
  generatedAt: string;
}

/**
 * Get admin dashboard statistics
 * Uses PostgreSQL RPC function - no custom JS logic
 * @param pharmacyId - Optional pharmacy ID to filter graph data
 * @param periodType - 'monthly' or 'yearly' (default: 'monthly')
 * @param periods - Number of periods to fetch (default: 12)
 */
export const getAdminDashboardStats = async (
  pharmacyId?: string,
  periodType: 'monthly' | 'yearly' = 'monthly',
  periods: number = 12,
  buyingGroupId?: string
): Promise<AdminDashboardResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  console.log(`📊 Fetching admin dashboard stats via RPC (pharmacyId: ${pharmacyId || 'all'}, periodType: ${periodType}, periods: ${periods}, buyingGroupId: ${buyingGroupId || 'all'})`);

  // Call PostgreSQL function - all aggregation done in database
  const { data, error } = await db.rpc('get_admin_dashboard_stats', {
    p_pharmacy_id: pharmacyId || null,
    p_period_type: periodType,
    p_periods: periods,
    p_buying_group_id: buyingGroupId || null,
  });

  if (error) {
    throw new AppError(`Failed to fetch admin dashboard stats: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from admin dashboard stats', 500);
  }

  console.log('✅ Admin dashboard stats fetched successfully');

  // Return database result directly - response structure matches interface
  return {
    stats: {
      totalPharmacies: data.stats.totalPharmacies,
      activeDistributors: data.stats.activeDistributors,
      returnsValue: data.stats.returnsValue,
    },
    pharmacies: data.pharmacies || [],
    returnsValueTrend: data.returnsValueTrend || [],
    period: {
      type: data.period.type,
      periods: data.period.periods,
      startDate: data.period.startDate,
      endDate: data.period.endDate,
      pharmacyId: data.period.pharmacyId,
    },
    generatedAt: data.generatedAt,
  };
};

