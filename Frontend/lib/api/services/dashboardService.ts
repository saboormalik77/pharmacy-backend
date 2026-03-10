/**
 * Dashboard API Service
 */

import { apiClient } from '../client';

export interface DashboardSummary {
  totalPharmacyAddedProducts: number;
  topDistributorCount: number;
  totalPackages: number;
  deliveredPackages: number;
  nonDeliveredPackages: number;
}

export interface PeriodEarning {
  period: string;
  label: string;
  earnings: number;
  documentsCount: number;
}

export interface DistributorEarning {
  distributorId: string;
  distributorName: string;
  totalEarnings: number;
  documentsCount: number;
}

export interface EarningsHistoryResponse {
  periodEarnings: PeriodEarning[];
  totalEarnings: number;
  averagePeriodEarnings: number;
  totalDocuments: number;
  byDistributor: DistributorEarning[];
  period: {
    startDate: string;
    endDate: string;
    type: 'monthly' | 'yearly';
    periods: number;
  };
}

export interface EarningsHistoryParams {
  periodType?: 'monthly' | 'yearly';
  periods?: number;
}

export interface EarningsEstimationChartData {
  period: string;
  label: string;
  actualEarnings: number;
  potentialEarnings: number;
  difference: number;
}

export interface EarningsEstimationResponse {
  summary: {
    totalActualEarnings: number;
    totalPotentialEarnings: number;
    totalMissedEarnings: number;
    optimizationScore: number;
    isAlreadyOptimal: boolean;
    periodType: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  chartData: EarningsEstimationChartData[];
  topMissedOpportunities: any[];
}

export const dashboardService = {
  /**
   * Get dashboard summary statistics
   */
  async getSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch dashboard summary');
  },

  /**
   * Get earnings history
   */
  async getEarningsHistory(params?: EarningsHistoryParams): Promise<EarningsHistoryResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.periodType) {
      queryParams.periodType = params.periodType;
    }
    if (params?.periods !== undefined) {
      queryParams.periods = params.periods.toString();
    }
    
    const response = await apiClient.get<EarningsHistoryResponse>('/dashboard/earnings/history', queryParams);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch earnings history');
  },

  /**
   * Get earnings estimation
   */
  async getEarningsEstimation(params?: EarningsHistoryParams): Promise<EarningsEstimationResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.periodType) {
      queryParams.periodType = params.periodType;
    }
    if (params?.periods !== undefined) {
      queryParams.periods = params.periods.toString();
    }
    
    const response = await apiClient.get<EarningsEstimationResponse>('/earnings-estimation', queryParams);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch earnings estimation');
  },
};

