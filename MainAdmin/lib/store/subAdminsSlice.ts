import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface SubAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  invite_accepted_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SubAdminsState {
  admins: SubAdmin[];
  selectedAdmin: SubAdmin | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  availablePermissions: string[];
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
}

const initialState: SubAdminsState = {
  admins: [],
  selectedAdmin: null,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  availablePermissions: [],
  isLoading: false,
  isLoadingDetail: false,
  error: null,
};

export const fetchSubAdmins = createAsyncThunk(
  'subAdmins/fetchAll',
  async (params: { page?: number; limit?: number; search?: string; status?: string }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      return await apiClient.get('/main-admin/sub-admins', true, params as any);
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to fetch sub admins');
    }
  }
);

export const fetchSubAdminById = createAsyncThunk(
  'subAdmins/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      return await apiClient.get(`/main-admin/sub-admins/${id}`);
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to fetch sub admin');
    }
  }
);

export const createSubAdmin = createAsyncThunk(
  'subAdmins/create',
  async (data: { email: string; name: string; role?: string; permissions: string[] }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      return await apiClient.post('/main-admin/sub-admins', data);
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to create sub admin');
    }
  }
);

export const updateSubAdmin = createAsyncThunk(
  'subAdmins/update',
  async (data: { id: string; name?: string; email?: string; role?: string; permissions?: string[]; isActive?: boolean }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { id, ...body } = data;
      return await apiClient.put(`/main-admin/sub-admins/${id}`, body);
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to update sub admin');
    }
  }
);

export const deleteSubAdmin = createAsyncThunk(
  'subAdmins/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      return await apiClient.delete(`/main-admin/sub-admins/${id}`);
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to delete sub admin');
    }
  }
);

export const resendInvite = createAsyncThunk(
  'subAdmins/resendInvite',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      return await apiClient.post(`/main-admin/sub-admins/${id}/resend-invite`, {});
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to resend invite');
    }
  }
);

export const fetchAvailablePermissions = createAsyncThunk(
  'subAdmins/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      return await apiClient.get<{ permissions: string[] }>('/main-admin/sub-admins/permissions');
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to fetch permissions');
    }
  }
);

const subAdminsSlice = createSlice({
  name: 'subAdmins',
  initialState,
  reducers: {
    clearSelectedAdmin: (state) => {
      state.selectedAdmin = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubAdmins.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubAdmins.fulfilled, (state, action) => {
        state.isLoading = false;
        const data = action.payload as any;
        state.admins = data.admins || [];
        state.pagination = data.pagination || initialState.pagination;
      })
      .addCase(fetchSubAdmins.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchSubAdminById.pending, (state) => {
        state.isLoadingDetail = true;
      })
      .addCase(fetchSubAdminById.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        const data = action.payload as any;
        state.selectedAdmin = data.admin || null;
      })
      .addCase(fetchSubAdminById.rejected, (state) => {
        state.isLoadingDetail = false;
      });

    builder
      .addCase(fetchAvailablePermissions.fulfilled, (state, action) => {
        const data = action.payload as any;
        state.availablePermissions = data.permissions || [];
      });
  },
});

export const { clearSelectedAdmin, clearError } = subAdminsSlice.actions;
export default subAdminsSlice.reducer;
