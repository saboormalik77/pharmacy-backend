import { apiClient } from '../client';

export interface ReturnTransaction {
  id: string;
  licensePlate: string;
  pharmacyId: string;
  pharmacyName?: string;
  status: string;
  createdAt: string;
}

export interface ReturnTransactionItem {
  id: string;
  ndc?: string;
  proprietaryName?: string;
  genericName?: string;
  manufacturer?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: string;
  quantity?: number;
  returnStatus: 'returnable' | 'non_returnable' | 'tbd';
  nonReturnableReason?: string;
  destination?: string;
  isPartial?: boolean;
  partialPercentage?: number;
  estimatedValue?: number;
  estimatedStoreValue?: number;
}

export const returnTransactionsService = {
  async listTransactions(params?: Record<string, string>) {
    const response = await apiClient.get<{ transactions: ReturnTransaction[] }>(
      '/return-transactions',
      params
    );
    if (response.status === 'success' && response.data) return response.data.transactions || [];
    throw new Error(response.message || 'Failed to fetch return transactions');
  },

  async listItems(transactionId: string, params?: Record<string, string>) {
    const response = await apiClient.get<{ items: ReturnTransactionItem[] }>(
      `/return-transactions/${transactionId}/items`,
      params
    );
    if (response.status === 'success' && response.data) return response.data.items || [];
    throw new Error(response.message || 'Failed to fetch return items');
  },

  async resolveItem(transactionId: string, itemId: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch(
      `/return-transactions/${transactionId}/items/${itemId}/resolve`,
      payload
    );
    if (response.status === 'success') return true;
    throw new Error(response.message || 'Failed to resolve item');
  },

  async scanBarcode(raw: string) {
    const response = await apiClient.post<any>('/barcode/scan', { raw });
    if (response.status === 'success' && response.data) return response.data;
    throw new Error(response.message || 'Failed to scan barcode');
  },

  async addItem(transactionId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post(
      `/return-transactions/${transactionId}/items`,
      payload
    );
    if (response.status === 'success') return response;
    throw new Error(response.message || 'Failed to add item');
  },
};
