/**
 * FCR Store Settings API Service
 * Handles pharmacy FCR (First Class Returns) store configuration
 */

import { apiClient } from '../client';

export interface FcrStoreSettings {
  storeNumber: string | null;
  primaryWholesaler: string | null;
  wholesalerAccountNumber: string | null;
  secondaryWholesaler: string | null;
  gpoAffiliation: string | null;
  serviceType: string;
  assignedProcessorId: string | null;
  assignedProcessorName: string | null;
  assignedSalesPersonId: string | null;
  lastVisitDate: string | null;
  nextVisitDate: string | null;
  daysBetweenVisits: number;
  deaExpirationDate: string | null;
  deaExpirationWarning: string | null;
  faxNumber: string | null;
}

export interface UpdateFcrStoreSettings {
  storeNumber?: string;
  primaryWholesaler?: string;
  wholesalerAccountNumber?: string;
  secondaryWholesaler?: string;
  gpoAffiliation?: string;
  serviceType?: string;
  deaExpirationDate?: string;
  daysBetweenVisits?: number;
  faxNumber?: string;
}

export const fcrStoreSettingsService = {
  /**
   * Get FCR store settings for the current pharmacy
   * Uses pharmacy auth token - no need to pass pharmacyId
   */
  async getStoreSettings(): Promise<FcrStoreSettings> {
    const response = await apiClient.get<{ storeSettings: FcrStoreSettings }>(
      '/settings/store-settings'
    );
    if (response.status === 'success' && response.data?.storeSettings) {
      return response.data.storeSettings;
    }
    throw new Error(response.message || 'Failed to fetch store settings');
  },

  /**
   * Update FCR store settings for the current pharmacy
   * Uses pharmacy auth token - no need to pass pharmacyId
   */
  async updateStoreSettings(
    updates: UpdateFcrStoreSettings
  ): Promise<FcrStoreSettings> {
    const response = await apiClient.patch<{ storeSettings: FcrStoreSettings }>(
      '/settings/store-settings',
      updates
    );
    if (response.status === 'success' && response.data?.storeSettings) {
      return response.data.storeSettings;
    }
    throw new Error(response.message || 'Failed to update store settings');
  },
};
