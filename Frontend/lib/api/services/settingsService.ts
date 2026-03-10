/**
 * Settings API Service
 */

import { apiClient } from '../client';

export interface UserSettings {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  pharmacyName?: string;
  npiNumber?: string;
  deaNumber?: string;
  physicalAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

// API response interface (snake_case)
interface ApiSettingsResponse {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string | null;
  pharmacy_name?: string;
  npi_number?: string;
  dea_number?: string;
  physical_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const settingsService = {
  /**
   * Get user settings/profile
   */
  async getSettings(): Promise<UserSettings> {
    const response = await apiClient.get<ApiSettingsResponse>('/settings');
    if (response.status === 'success' && response.data) {
      // Transform snake_case API response to camelCase
      const apiData = response.data;
      return {
        name: apiData.name,
        email: apiData.email,
        phone: apiData.phone,
        title: apiData.title || undefined,
        pharmacyName: apiData.pharmacy_name,
        npiNumber: apiData.npi_number,
        deaNumber: apiData.dea_number,
        physicalAddress: apiData.physical_address,
      };
    }
    throw new Error(response.message || 'Failed to fetch settings');
  },

  /**
   * Update user profile
   * Only sends fields that are updated
   */
  async updateProfile(data: Partial<UserSettings>): Promise<UserSettings> {
    // Transform camelCase to snake_case for API
    const apiData: any = {};
    if (data.name !== undefined) apiData.name = data.name;
    if (data.email !== undefined) apiData.email = data.email;
    if (data.phone !== undefined) apiData.phone = data.phone;
    if (data.title !== undefined) apiData.title = data.title;
    if (data.pharmacyName !== undefined) apiData.pharmacy_name = data.pharmacyName;
    if (data.npiNumber !== undefined) apiData.npi_number = data.npiNumber;
    if (data.deaNumber !== undefined) apiData.dea_number = data.deaNumber;
    if (data.physicalAddress !== undefined) apiData.physical_address = data.physicalAddress;

    const response = await apiClient.patch<ApiSettingsResponse>('/settings', apiData);
    if (response.status === 'success' && response.data) {
      // Transform snake_case API response to camelCase
      const apiResponse = response.data;
      return {
        name: apiResponse.name,
        email: apiResponse.email,
        phone: apiResponse.phone,
        title: apiResponse.title || undefined,
        pharmacyName: apiResponse.pharmacy_name,
        npiNumber: apiResponse.npi_number,
        deaNumber: apiResponse.dea_number,
        physicalAddress: apiResponse.physical_address,
      };
    }
    throw new Error(response.message || 'Failed to update profile');
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await apiClient.post('/settings/change-password', data);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to change password');
    }
  },
};

