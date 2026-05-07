/**
 * Analytics API Service - Pharmacy Frontend
 * Calls the pharmacy-dashboard analytics endpoint
 */

import { apiClient } from '../client';

export interface PharmacyDashboardOverview {
  totalReturns: number;
  totalItems: number;
  totalReturnableValue: number;
  totalNonReturnableValue: number;
  inProgressReturns: number;
  completedReturns: number;
  avgItemsPerReturn: number;
}

export interface ReturnsTrendItem {
  period: string;
  periodKey: string;
  returns: number;
  totalValue: number;
  totalItems: number;
}

export interface CreditsSummary {
  totalCreditsReceived: number;
  totalCompanyFee: number;
  totalGpoShare: number;
  totalPayout: number;
  paidPayout: number;
  pendingPayout: number;
  totalPayments: number;
  estimatedVsActual: {
    estimatedValue: number;
    actualReceived: number;
    recoveryPercent: number;
  };
}

export interface TopProduct {
  ndc: string;
  productName: string;
  manufacturer: string;
  totalQuantity: number;
  totalValue: number;
  returnCount: number;
}

export interface RecentReturn {
  id: string;
  licensePlate: string;
  status: string;
  totalItems: number;
  returnableValue: number;
  serviceType: string;
  createdAt: string;
}

export interface PharmacyDashboardData {
  periodStart: string;
  periodEnd: string;
  overview: PharmacyDashboardOverview;
  returnsTrend: ReturnsTrendItem[];
  creditsSummary: CreditsSummary;
  topProducts: TopProduct[];
  recentReturns: RecentReturn[];
}

export interface AnalyticsParams {
  period_start?: string;
  period_end?: string;
}

export const analyticsService = {
  /**
   * Get pharmacy dashboard analytics
   */
  async getDashboard(params?: AnalyticsParams): Promise<PharmacyDashboardData> {
    const queryParams: Record<string, string> = {};
    if (params?.period_start) {
      queryParams.period_start = params.period_start;
    }
    if (params?.period_end) {
      queryParams.period_end = params.period_end;
    }

    const response = await apiClient.get<PharmacyDashboardData>('/analytics/pharmacy-dashboard', queryParams);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch analytics dashboard');
  },
};
