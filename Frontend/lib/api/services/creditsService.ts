/**
 * Credits API Service
 */

import { apiClient } from '../client';

export interface CreditEstimateItem {
  ndc: string;
  product_name?: string;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  unit?: string;
}

export interface CreditEstimate {
  items: Array<{
    ndc: string;
    product_name: string;
    lot_number: string;
    expiration_date: string;
    quantity: number;
    unit: string;
    estimated_credit: number;
    price_per_unit: number;
  }>;
  total_estimated_credit: number;
}

export const creditsService = {
  /**
   * Estimate credits for return items
   */
  async estimateCredits(items: CreditEstimateItem[]): Promise<CreditEstimate> {
    const response = await apiClient.post<CreditEstimate>('/credits/estimate', { items });
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to estimate credits');
  },
};

