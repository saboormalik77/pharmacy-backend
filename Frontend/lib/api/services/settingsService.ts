/**
 * Settings API Service
 */

import { apiClient } from '../client';

export interface UserSettings {
  name?: string;
  email?: string;
  phone?: string;
  pharmacyName?: string;
  npiNumber?: string;
  deaNumber?: string;
  stateLicenseNumber?: string;
  licenseExpiryDate?: string;
  corporateName?: string;
  mailingAddress?: string;
  storeHours?: string;
  deaFileUrl?: string;
  licenseFileUrl?: string;
  physicalAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

interface ApiSettingsResponse {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  pharmacy_name?: string;
  npi_number?: string;
  dea_number?: string;
  state_license_number?: string | null;
  license_expiry_date?: string | null;
  corporate_name?: string | null;
  mailing_address?: string | null;
  store_hours?: string | null;
  dea_file_url?: string | null;
  license_file_url?: string | null;
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

export interface UploadDocumentResponse {
  url: string;
  documentType: 'dea' | 'license';
}

export const settingsService = {
  async getSettings(): Promise<UserSettings> {
    const response = await apiClient.get<ApiSettingsResponse>('/settings');
    if (response.status === 'success' && response.data) {
      const apiData = response.data;
      return {
        name: apiData.name,
        email: apiData.email,
        phone: apiData.phone,
        pharmacyName: apiData.pharmacy_name,
        npiNumber: apiData.npi_number,
        deaNumber: apiData.dea_number,
        stateLicenseNumber: apiData.state_license_number || undefined,
        licenseExpiryDate: apiData.license_expiry_date || undefined,
        corporateName: apiData.corporate_name || undefined,
        mailingAddress: apiData.mailing_address || undefined,
        storeHours: apiData.store_hours || undefined,
        deaFileUrl: apiData.dea_file_url || undefined,
        licenseFileUrl: apiData.license_file_url || undefined,
        physicalAddress: apiData.physical_address,
      };
    }
    throw new Error(response.message || 'Failed to fetch settings');
  },

  async updateProfile(data: Partial<UserSettings>): Promise<UserSettings> {
    const apiData: any = {};
    if (data.name !== undefined) apiData.name = data.name;
    if (data.email !== undefined) apiData.email = data.email;
    if (data.phone !== undefined) apiData.phone = data.phone;
    if (data.pharmacyName !== undefined) apiData.pharmacy_name = data.pharmacyName;
    if (data.npiNumber !== undefined) apiData.npi_number = data.npiNumber;
    if (data.deaNumber !== undefined) apiData.dea_number = data.deaNumber;
    if (data.stateLicenseNumber !== undefined) apiData.state_license_number = data.stateLicenseNumber;
    if (data.licenseExpiryDate !== undefined) apiData.license_expiry_date = data.licenseExpiryDate;
    if (data.corporateName !== undefined) apiData.corporate_name = data.corporateName;
    if (data.mailingAddress !== undefined) apiData.mailing_address = data.mailingAddress;
    if (data.storeHours !== undefined) apiData.store_hours = data.storeHours;
    if (data.physicalAddress !== undefined) apiData.physical_address = data.physicalAddress;

    const response = await apiClient.patch<ApiSettingsResponse>('/settings', apiData);
    if (response.status === 'success' && response.data) {
      const apiResponse = response.data;
      return {
        name: apiResponse.name,
        email: apiResponse.email,
        phone: apiResponse.phone,
        pharmacyName: apiResponse.pharmacy_name,
        npiNumber: apiResponse.npi_number,
        deaNumber: apiResponse.dea_number,
        stateLicenseNumber: apiResponse.state_license_number || undefined,
        licenseExpiryDate: apiResponse.license_expiry_date || undefined,
        corporateName: apiResponse.corporate_name || undefined,
        mailingAddress: apiResponse.mailing_address || undefined,
        storeHours: apiResponse.store_hours || undefined,
        deaFileUrl: apiResponse.dea_file_url || undefined,
        licenseFileUrl: apiResponse.license_file_url || undefined,
        physicalAddress: apiResponse.physical_address,
      };
    }
    throw new Error(response.message || 'Failed to update profile');
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await apiClient.post('/settings/change-password', data);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to change password');
    }
  },

  async uploadDocument(documentType: 'dea' | 'license', file: File): Promise<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const response = await apiClient.upload<UploadDocumentResponse>('/settings/upload-document', formData);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to upload document');
  },
};
