import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, LoginCredentials, LoginResponse } from '@/lib/types/auth';
import { cookieUtils } from '@/lib/utils/cookies';

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');

      const data: LoginResponse = await apiClient.post('/main-admin/auth/login', credentials, false);

      const authToken = data.token || data.accessToken || data.access_token;

      const rawUser = data.user || {
        id: data.id || data.userId || '',
        email: data.email || credentials.email,
        name: data.name || 'Main Admin',
        role: data.role,
        permissions: data.permissions,
      };
      const userData: User = { ...rawUser };

      if (!authToken) {
        return rejectWithValue('No token received from server');
      }

      cookieUtils.setAuthToken(authToken);
      cookieUtils.setUser(userData);

      return { token: authToken, user: userData };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'An error occurred during login');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      cookieUtils.clearAuth();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'An error occurred during logout');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const storedToken = cookieUtils.getAuthToken();
      const storedUser = cookieUtils.getUser();

      if (storedToken && storedUser) {
        return { token: storedToken, user: storedUser };
      }

      return rejectWithValue('No stored authentication found');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error checking auth status');
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

    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
