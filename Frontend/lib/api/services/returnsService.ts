/**
 * Returns API Service
 */

import { apiClient } from '../client';
import { Return, ReturnItem } from '@/types';

export interface CreateReturnRequest {
  items: Array<{
    ndc: string;
    product_name?: string;
    lot_number: string;
    expiration_date: string;
    quantity: number;
    unit?: string;
    reason?: string;
  }>;
  notes?: string;
}

export interface UpdateReturnRequest {
  status?: string;
  notes?: string;
  items?: ReturnItem[];
}

export interface ReturnsFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export const returnsService = {
  /**
   * Get all returns
   */
  async getReturns(filters?: ReturnsFilters): Promise<{ returns: Return[]; total: number }> {
    const response = await apiClient.get<Return[]>('/returns', filters);
    if (response.status === 'success' && response.data) {
      return {
        returns: Array.isArray(response.data) ? response.data : [],
        total: response.total || 0,
      };
    }
    throw new Error(response.message || 'Failed to fetch returns');
  },

  /**
   * Get return by ID
   */
  async getReturnById(id: string): Promise<Return> {
    const response = await apiClient.get<Return>(`/returns/${id}`);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch return');
  },

  /**
   * Create a new return
   */
  async createReturn(data: CreateReturnRequest): Promise<Return> {
    const response = await apiClient.post<Return>('/returns', data);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create return');
  },

  /**
   * Update a return
   */
  async updateReturn(id: string, data: UpdateReturnRequest): Promise<Return> {
    const response = await apiClient.patch<Return>(`/returns/${id}`, data);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update return');
  },

  /**
   * Delete a return
   */
  async deleteReturn(id: string): Promise<void> {
    const response = await apiClient.delete(`/returns/${id}`);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete return');
    }
  },

  /**
   * Search return reports for stats/graph data
   * @param distributorId - The distributor ID
   * @param ndcCode - The NDC code
   * @param format - Format of the response (e.g., 'graph')
   * @param type - Type of product: 'full' or 'partial' (optional)
   */
  async searchReturnReports(
    distributorId: string,
    ndcCode: string,
    format: string = 'graph',
    type?: string
  ): Promise<any> {
    const params: any = {
      distributor_id: distributorId,
      ndc_code: ndcCode,
      format: format,
    };
    
    // Add type parameter if provided
    if (type) {
      params.type = type;
    }
    
    const response = await apiClient.get<any>('/return-reports/search', params);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch return reports');
  },

  /**
   * Check if return is locked for editing
   */
  async checkLockStatus(id: string): Promise<{
    id: string;
    status: string;
    isLocked: boolean;
    canEdit: boolean;
    lockReason: string | null;
  }> {
    const response = await apiClient.get<any>(`/returns/${id}/lock-status`);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to check lock status');
  },
};

