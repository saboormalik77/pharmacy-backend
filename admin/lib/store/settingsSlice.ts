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
  async (_, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
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
      .addCase(fetchSettings.fulfilled, (state, action: PayloadAction<Settings>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.error = null;
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

