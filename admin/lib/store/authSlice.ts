import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, LoginCredentials, LoginResponse } from '@/lib/types/auth';
import { cookieUtils } from '@/lib/utils/cookies';

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Load auth state from cookies on initialization
if (typeof window !== 'undefined') {
  const storedToken = cookieUtils.getAuthToken();
  const storedUser = cookieUtils.getUser();

  if (storedToken && storedUser) {
    try {
      initialState.token = storedToken;
      initialState.user = storedUser;
      initialState.isAuthenticated = true;
    } catch (error) {
      // Invalid stored data, clear it
      cookieUtils.clearAuth();
    }
  }
}

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      // Import apiClient dynamically to avoid SSR issues
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const data: LoginResponse = await apiClient.post('/auth/login', credentials, false);
      
      // Extract token (supports multiple field names)
      const authToken = data.token || data.accessToken || data.access_token;
      
      // Extract user data
      const userData: User = data.user || {
        id: data.id || data.userId || '',
        email: data.email || credentials.email,
        name: data.name || data.username || 'Admin User',
        role: data.role,
      };

      if (!authToken) {
        return rejectWithValue('No token received from server');
      }

      // Store in cookies
      cookieUtils.setAuthToken(authToken);
      cookieUtils.setUser(userData);

      return {
        token: authToken,
        user: userData,
      };
    } catch (error: any) {
      // Handle ApiError from apiClient
      const errorMessage = error?.message || 'An error occurred during login';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Clear cookies
      cookieUtils.clearAuth();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'An error occurred during logout');
    }
  }
);

// Async thunk to check auth status (for future use, e.g., token refresh)
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const storedToken = cookieUtils.getAuthToken();
      const storedUser = cookieUtils.getUser();

      if (storedToken && storedUser) {
        return {
          token: storedToken,
          user: storedUser,
        };
      }

      return rejectWithValue('No stored authentication found');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error checking auth status');
    }
  }
);

// Async thunk for forgot password
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const data = await apiClient.post('/auth/admin/forgot-password', { 
        email,
        redirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/reset-password`
          : undefined
      }, false);
      
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to send password reset email');
    }
  }
);

// Async thunk to verify reset token
export const verifyResetToken = createAsyncThunk(
  'auth/verifyResetToken',
  async (token: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const data: any = await apiClient.post('/auth/admin/verify-reset-token', { token }, false);
      
      return data?.data || data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Invalid or expired reset token');
    }
  }
);

// Async thunk to reset password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }: { token: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const data = await apiClient.post('/auth/admin/reset-password', { token, newPassword }, false);
      
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to reset password');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login cases
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout cases
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Check auth status cases
    builder
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;

