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
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
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

  /**
   * Get check PDF data for generating PDF
   */
  async getCheckPdf(checkNumber: string): Promise<Blob> {
    try {
      const { getToken } = await import('@/lib/utils/cookies');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const token = getToken();
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${apiUrl}/pharmacy-payments/check-pdf/${checkNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate check PDF');
      }
      
      return await response.blob();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to generate check PDF');
    }
  },
};
