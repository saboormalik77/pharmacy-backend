import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  AdminsResponse, 
  Admin, 
  AdminsStats,
  AdminCreatePayload,
  AdminUpdatePayload,
  AdminPasswordUpdatePayload
} from '@/lib/types';

export interface AdminsState {
  admins: Admin[];
  stats: AdminsStats | null;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null;
  filters: {
    search: string;
    role: 'all' | 'super_admin' | 'manager' | 'reviewer' | 'support';
    status: 'all' | 'active' | 'inactive';
    sortBy: 'name' | 'email' | 'role' | 'created_at' | 'last_login_at';
    sortOrder: 'asc' | 'desc';
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminsState = {
  admins: [],
  stats: null,
  pagination: null,
  filters: {
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
  },
  isLoading: false,
  error: null,
};

export interface FetchAdminsParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'all' | 'super_admin' | 'manager' | 'reviewer' | 'support';
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'email' | 'role' | 'created_at' | 'last_login_at';
  sortOrder?: 'asc' | 'desc';
}

// Async thunk for fetching admins
export const fetchAdmins = createAsyncThunk(
  'admins/fetch',
  async (params: FetchAdminsParams = {}, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      const queryParams: Record<string, string | number | undefined> = {};

      if (params.page !== undefined) {
        queryParams.page = params.page;
      }
      if (params.limit !== undefined) {
        queryParams.limit = params.limit;
      }
      if (params.search) {
        queryParams.search = params.search;
      }
      if (params.role && params.role !== 'all') {
        queryParams.role = params.role;
      }
      if (params.status && params.status !== 'all') {
        queryParams.status = params.status;
      }
      if (params.sortBy) {
        queryParams.sortBy = params.sortBy;
      }
      if (params.sortOrder) {
        queryParams.sortOrder = params.sortOrder;
      }

      const data: AdminsResponse = await apiClient.get<AdminsResponse>(
        '/admin/users',
        true,
        queryParams
      );

      return data.data;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error fetching admins:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      // Don't redirect on non-auth errors - let the component handle it
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while fetching admins';
      
      // Only reject with value, don't throw - this prevents automatic redirects
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for creating a new admin
export const createAdmin = createAsyncThunk(
  'admins/create',
  async (payload: AdminCreatePayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      console.log('Creating admin with payload:', { ...payload, password: '***' });
      const response = await apiClient.post<{ status: string; data: Admin }>(
        '/admin/users',
        payload,
        true
      );

      return response.data;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error creating admin:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while creating the admin';
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating an admin
export const updateAdmin = createAsyncThunk(
  'admins/update',
  async ({ id, payload }: { id: string; payload: AdminUpdatePayload }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      const response = await apiClient.patch<{ status: string; data: Admin }>(
        `/admin/users/${id}`,
        payload,
        true
      );

      return response.data;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error updating admin:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while updating the admin';
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating admin password
export const updateAdminPassword = createAsyncThunk(
  'admins/updatePassword',
  async ({ id, payload }: { id: string; payload: AdminPasswordUpdatePayload }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      await apiClient.patch<{ status: string; message?: string }>(
        `/admin/users/${id}/password`,
        payload,
        true
      );

      return { id, success: true };
    } catch (error: any) {
      // Log detailed error information
      console.error('Error updating admin password:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while updating the password';
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for deleting an admin
export const deleteAdmin = createAsyncThunk(
  'admins/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      await apiClient.delete<{ status: string; message?: string }>(
        `/admin/users/${id}`,
        true
      );

      return id;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error deleting admin:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while deleting the admin';
      
      return rejectWithValue(errorMessage);
    }
  }
);

const adminsSlice = createSlice({
  name: 'admins',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<AdminsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch admins
    builder
      .addCase(fetchAdmins.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.isLoading = false;
        state.admins = action.payload.admins || [];
        state.stats = action.payload.stats || null;
        
        // Handle pagination - calculate hasNextPage/hasPreviousPage if not provided
        const pagination = action.payload.pagination;
        if (pagination) {
          state.pagination = {
            page: pagination.page,
            limit: pagination.limit,
            totalCount: pagination.total,
            totalPages: pagination.totalPages,
            hasNextPage: pagination.page < pagination.totalPages,
            hasPreviousPage: pagination.page > 1,
          };
        } else {
          state.pagination = null;
        }
        
        state.error = null;
      })
      .addCase(fetchAdmins.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create admin
      .addCase(createAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        // Add new admin to the list
        if (action.payload) {
          state.admins = [action.payload, ...(state.admins || [])];
        }
        state.error = null;
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete admin
      .addCase(deleteAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        // Remove deleted admin from the list
        state.admins = (state.admins || []).filter(admin => admin.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update admin
      .addCase(updateAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the admin in the list
        if (action.payload) {
          state.admins = (state.admins || []).map(admin => 
            admin.id === action.payload.id ? action.payload : admin
          );
        }
        state.error = null;
      })
      .addCase(updateAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update admin password
      .addCase(updateAdminPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAdminPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateAdminPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearError } = adminsSlice.actions;
export default adminsSlice.reducer;

