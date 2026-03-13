/**
 * Pharmacy Payment API Service
 * Module 13: Pharmacy & GPO Payout
 */

import { apiClient } from '../client';
import type { PharmacyPayment, PharmacyPaymentSummary } from '@/types';

export interface PharmacyPaymentListResponse {
  data: PharmacyPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: PharmacyPaymentSummary;
}

export const pharmacyPaymentService = {
  /**
   * Get authenticated pharmacy's own payment history
   */
  async getMyPayments(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PharmacyPaymentListResponse> {
    const response = await apiClient.get<any>('/pharmacy-payments/my-payments', params);
    if (response.status === 'success') {
      return {
        data: (response as any).data || [],
        pagination: (response as any).pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: (response as any).summary || {
          totalCredits: 0,
          totalFees: 0,
          totalPayout: 0,
          paidPayouts: 0,
          pendingPayouts: 0,
          totalPayments: 0,
          paidCount: 0,
          pendingCount: 0,
        },
      };
    }
    throw new Error(response.message || 'Failed to fetch payments');
  },
};
