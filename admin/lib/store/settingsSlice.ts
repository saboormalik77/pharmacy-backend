import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Settings {
  siteName: string;
  siteEmail: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  documentApprovalNotif: boolean;
  paymentNotif: boolean;
  shipmentNotif: boolean;
  warehouseName: string | null;
  warehouseStreet: string | null;
  warehouseCity: string | null;
  warehouseState: string | null;
  warehouseZip: string | null;
  warehouseCountry: string | null;
  warehousePhone: string | null;
  warehouseContactName: string | null;
  businessName: string | null;
  logoUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettingsResponse {
  status: string;
  data: {
    settings: Settings;
  };
}

export interface UpdateNotificationSettingsPayload {
  emailNotifications: boolean;
  documentApprovalNotif: boolean;
  paymentNotif: boolean;
  shipmentNotif: boolean;
}

export interface UpdateWarehouseAddressPayload {
  warehouseName?: string;
  warehouseStreet?: string;
  warehouseCity?: string;
  warehouseState?: string;
  warehouseZip?: string;
  warehouseCountry?: string;
  warehousePhone?: string;
  warehouseContactName?: string;
}

export interface UpdateBusinessSettingsPayload {
  businessName?: string;
  logoUrl?: string | null;
}

export interface ResetPasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  isUpdating: boolean;
  isResettingPassword: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  isLoading: false,
  isUpdating: false,
  isResettingPassword: false,
  error: null,
};

// Async thunk for fetching settings
export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      // Check if user is a processor - they don't need settings data
      const state = getState() as any;
      const user = state.auth?.user;
      if (user?.role === 'processor') {
        console.log('Skipping settings fetch for processor user');
        return null; // Return null or empty settings for processors
      }
      
      const data: SettingsResponse = await apiClient.get<SettingsResponse>(
        '/admin/settings',
        true
      );

      return data.data.settings;
    } catch (error: any) {
      console.error('Error fetching settings:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while fetching settings';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating notification settings
export const updateNotificationSettings = createAsyncThunk(
  'settings/updateNotifications',
  async (payload: UpdateNotificationSettingsPayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      const data: SettingsResponse = await apiClient.patch<SettingsResponse>(
        '/admin/settings',
        payload,
        true
      );

      return data.data.settings;
    } catch (error: any) {
      console.error('Error updating notification settings:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while updating notification settings';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating warehouse address
export const updateWarehouseAddress = createAsyncThunk(
  'settings/updateWarehouseAddress',
  async (payload: UpdateWarehouseAddressPayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');

      const token = cookieUtils.getAuthToken();
      if (!token) {
        return rejectWithValue('Authentication required. Please login again.');
      }

      const data: SettingsResponse = await apiClient.patch<SettingsResponse>(
        '/admin/settings',
        payload,
        true
      );

      return data.data.settings;
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while updating warehouse address';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating business settings
export const updateBusinessSettings = createAsyncThunk(
  'settings/updateBusinessSettings',
  async (payload: UpdateBusinessSettingsPayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');

      const token = cookieUtils.getAuthToken();
      if (!token) {
        return rejectWithValue('Authentication required. Please login again.');
      }

      const data: SettingsResponse = await apiClient.patch<SettingsResponse>(
        '/admin/settings',
        payload,
        true
      );

      return data.data.settings;
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while updating business settings';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for uploading logo
export const uploadLogo = createAsyncThunk(
  'settings/uploadLogo',
  async (file: File, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');

      const token = cookieUtils.getAuthToken();
      if (!token) {
        return rejectWithValue('Authentication required. Please login again.');
      }

      const formData = new FormData();
      formData.append('logo', file);

      const data = await apiClient.postFormData<{
        status: string;
        data: { logoUrl: string; settings: Settings };
      }>('/admin/settings/upload-logo', formData, true);

      return data.data.settings;
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while uploading logo';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for resetting password
export const resetPassword = createAsyncThunk(
  'settings/resetPassword',
  async (payload: ResetPasswordPayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      const data = await apiClient.post<{ status: string; message?: string }>(
        '/admin/settings/reset-password',
        payload,
        true
      );

      return data;
    } catch (error: any) {
      console.error('Error resetting password:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while resetting password';
      return rejectWithValue(errorMessage);
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action: PayloadAction<Settings | null>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.error = null;
        if (typeof window !== 'undefined' && action.payload) {
          localStorage.setItem('adminBranding', JSON.stringify({
            logoUrl: action.payload.logoUrl ?? null,
            businessName: action.payload.businessName ?? null,
          }));
        }
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update notification settings
    builder
      .addCase(updateNotificationSettings.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateNotificationSettings.fulfilled, (state, action: PayloadAction<Settings>) => {
        state.isUpdating = false;
        state.settings = action.payload;
        state.error = null;
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Update warehouse address
    builder
      .addCase(updateWarehouseAddress.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateWarehouseAddress.fulfilled, (state, action: PayloadAction<Settings>) => {
        state.isUpdating = false;
        state.settings = action.payload;
        state.error = null;
      })
      .addCase(updateWarehouseAddress.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Update business settings
    builder
      .addCase(updateBusinessSettings.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateBusinessSettings.fulfilled, (state, action: PayloadAction<Settings>) => {
        state.isUpdating = false;
        state.settings = action.payload;
        state.error = null;
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminBranding', JSON.stringify({
            logoUrl: action.payload.logoUrl ?? null,
            businessName: action.payload.businessName ?? null,
          }));
        }
      })
      .addCase(updateBusinessSettings.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Upload logo
    builder
      .addCase(uploadLogo.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(uploadLogo.fulfilled, (state, action: PayloadAction<Settings>) => {
        state.isUpdating = false;
        state.settings = action.payload;
        state.error = null;
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminBranding', JSON.stringify({
            logoUrl: action.payload.logoUrl ?? null,
            businessName: action.payload.businessName ?? null,
          }));
        }
      })
      .addCase(uploadLogo.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Reset password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isResettingPassword = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isResettingPassword = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isResettingPassword = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;

