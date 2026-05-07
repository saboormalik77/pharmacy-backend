/**
 * Inventory API Service
 */

import { apiClient } from '../client';
import { InventoryItem } from '@/types';

export interface CreateInventoryItemRequest {
  ndc: string;
  product_name: string;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  unit?: string;
  location?: string;
  boxes?: number;
  tablets_per_box?: number;
}

export interface UpdateInventoryItemRequest extends Partial<CreateInventoryItemRequest> {
  id: string;
}

export interface InventoryFilters {
  status?: 'active' | 'expiring_soon' | 'expired';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InventoryMetrics {
  totalItems: number;
  activeItems: number;
  expiringSoonItems: number;
  expiredItems: number;
  totalValue: number;
}

export const inventoryService = {
  /**
   * Get all inventory items
   */
  async getInventoryItems(filters?: InventoryFilters): Promise<{ items: InventoryItem[]; total: number }> {
    const response = await apiClient.get<InventoryItem[]>('/inventory', filters);
    if (response.status === 'success' && response.data) {
      return {
        items: Array.isArray(response.data) ? response.data : [],
        total: response.total || 0,
      };
    }
    throw new Error(response.message || 'Failed to fetch inventory items');
  },

  /**
   * Get inventory item by ID
   */
  async getInventoryItemById(id: string): Promise<InventoryItem> {
    const response = await apiClient.get<InventoryItem>(`/inventory/${id}`);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch inventory item');
  },

  /**
   * Create a new inventory item
   */
  async createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItem> {
    const response = await apiClient.post<InventoryItem>('/inventory', data);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create inventory item');
  },

  /**
   * Update an inventory item
   */
  async updateInventoryItem(id: string, data: Partial<CreateInventoryItemRequest>): Promise<InventoryItem> {
    const response = await apiClient.patch<InventoryItem>(`/inventory/${id}`, data);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update inventory item');
  },

  /**
   * Delete an inventory item
   */
  async deleteInventoryItem(id: string): Promise<void> {
    const response = await apiClient.delete(`/inventory/${id}`);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete inventory item');
    }
  },

  /**
   * Get inventory metrics
   */
  async getInventoryMetrics(): Promise<InventoryMetrics> {
    const response = await apiClient.get<InventoryMetrics>('/inventory/metrics');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch inventory metrics');
  },
};

