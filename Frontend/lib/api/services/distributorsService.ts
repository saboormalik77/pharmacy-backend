/**
 * Distributors API Service
 */

import { apiClient } from '../client';

export interface TopDistributor {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  location?: string;
  active: boolean;
  documentCount?: number;
  totalCreditAmount?: number;
  lastActivityDate?: string;
}

export interface TopDistributorsResponse {
  distributors: TopDistributor[];
  total: number;
}

export const distributorsService = {
  /**
   * Get top distributors
   */
  async getTopDistributors(): Promise<TopDistributorsResponse> {
    const response = await apiClient.getApiWithoutPharmacyId<TopDistributor[]>(
      '/distributors/top'
    );
    if (response.status === 'success' && response.data) {
      // Transform API response
      const distributors = Array.isArray(response.data) ? response.data : [];
      
      const transformedDistributors = distributors.map((dist: any) => ({
        id: dist.id,
        name: dist.name,
        code: dist.code,
        email: dist.email,
        phone: dist.phone,
        location: dist.location,
        active: dist.active !== undefined ? dist.active : false,
        documentCount: dist.documentCount || dist.document_count,
        totalCreditAmount: dist.totalCreditAmount || dist.total_credit_amount,
        lastActivityDate: dist.lastActivityDate || dist.last_activity_date,
      }));

      return {
        distributors: transformedDistributors,
        total: transformedDistributors.length,
      };
    }
    throw new Error(response.message || 'Failed to fetch top distributors');
  },
};

