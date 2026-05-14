import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface BuyingGroup {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  adminCount: number;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  supabaseEnabled: boolean | null;
}

export interface BuyingGroupAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface BuyingGroupDomain {
  id: string;
  domain: string;
  adminHostname: string | null;
  pharmacyHostname: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BuyingGroupsState {
  buyingGroups: BuyingGroup[];
  selectedGroup: BuyingGroup | null;
  selectedGroupAdmins: BuyingGroupAdmin[];
  selectedGroupDomains: BuyingGroupDomain[];
  isLoadingDomains: boolean;
  stats: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
}

const initialState: BuyingGroupsState = {
  buyingGroups: [],
  selectedGroup: null,
  selectedGroupAdmins: [],
  selectedGroupDomains: [],
  isLoadingDomains: false,
  stats: { total: 0, active: 0, inactive: 0, suspended: 0 },
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: false,
  isLoadingDetail: false,
  error: null,
};

export const fetchBuyingGroups = createAsyncThunk(
  'buyingGroups/fetchAll',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const queryParams: Record<string, string | number | undefined> = {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search,
        status: params.status,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      };
      const data = await apiClient.get<any>('/main-admin/buying-groups', true, queryParams);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch buying groups');
    }
  }
);

export const fetchBuyingGroupById = createAsyncThunk(
  'buyingGroups/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const data = await apiClient.get<any>(`/main-admin/buying-groups/${id}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch buying group');
    }
  }
);

export const createBuyingGroup = createAsyncThunk(
  'buyingGroups/create',
  async (params: {
    name: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    notes?: string;
    adminEmail?: string;
    adminPassword?: string;
    adminName?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    supabaseServiceRoleKey?: string;
    supabaseEnabled?: boolean;
  }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const data = await apiClient.post<any>('/main-admin/buying-groups', params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to create buying group');
    }
  }
);

export const updateBuyingGroup = createAsyncThunk(
  'buyingGroups/update',
  async ({ id, ...params }: {
    id: string;
    name?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    status?: string;
    notes?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    supabaseServiceRoleKey?: string;
    supabaseEnabled?: boolean;
  }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const data = await apiClient.put<any>(`/main-admin/buying-groups/${id}`, params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to update buying group');
    }
  }
);

export const deleteBuyingGroup = createAsyncThunk(
  'buyingGroups/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const data = await apiClient.delete<any>(`/main-admin/buying-groups/${id}`);
      return { ...data, id };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to delete buying group');
    }
  }
);

// ============================================================
// Buying Group Domain Management
// ============================================================

export const fetchBuyingGroupDomains = createAsyncThunk(
  'buyingGroups/fetchDomains',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const resp = await apiClient.get<{ status: string; data: BuyingGroupDomain[] }>(
        `/main-admin/buying-groups/${groupId}/domains`
      );
      return resp?.data || [];
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch domains');
    }
  }
);

export const upsertBuyingGroupDomain = createAsyncThunk(
  'buyingGroups/upsertDomain',
  async (
    params: {
      groupId: string;
      domain: string;
      adminHostname?: string | null;
      pharmacyHostname?: string | null;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const data = await apiClient.post<any>(
        `/main-admin/buying-groups/${params.groupId}/domains`,
        {
          domain: params.domain,
          adminHostname: params.adminHostname ?? null,
          pharmacyHostname: params.pharmacyHostname ?? null,
        }
      );
      await dispatch(fetchBuyingGroupDomains(params.groupId));
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to save domain');
    }
  }
);

export const deleteBuyingGroupDomain = createAsyncThunk(
  'buyingGroups/deleteDomain',
  async (
    params: { groupId: string; domainId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const data = await apiClient.delete<any>(
        `/main-admin/buying-groups/domains/${params.domainId}`
      );
      await dispatch(fetchBuyingGroupDomains(params.groupId));
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to delete domain');
    }
  }
);

const buyingGroupsSlice = createSlice({
  name: 'buyingGroups',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedGroup: (state) => {
      state.selectedGroup = null;
      state.selectedGroupAdmins = [];
      state.selectedGroupDomains = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBuyingGroups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBuyingGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.buyingGroups = action.payload.buyingGroups || [];
        state.stats = action.payload.stats || initialState.stats;
        state.pagination = action.payload.pagination || initialState.pagination;
      })
      .addCase(fetchBuyingGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchBuyingGroupById.pending, (state) => {
        state.isLoadingDetail = true;
        state.error = null;
      })
      .addCase(fetchBuyingGroupById.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        state.selectedGroup = action.payload.buyingGroup || null;
        state.selectedGroupAdmins = action.payload.admins || [];
      })
      .addCase(fetchBuyingGroupById.rejected, (state, action) => {
        state.isLoadingDetail = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createBuyingGroup.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(createBuyingGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(updateBuyingGroup.fulfilled, (state, action) => {
        state.error = null;
        const updated = (action.payload as any)?.buyingGroup;
        if (updated?.id) {
          const idx = state.buyingGroups.findIndex(g => g.id === updated.id);
          if (idx !== -1) {
            state.buyingGroups[idx] = { ...state.buyingGroups[idx], ...updated };
          }
        }
      })
      .addCase(updateBuyingGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteBuyingGroup.fulfilled, (state, action) => {
        state.buyingGroups = state.buyingGroups.filter(g => g.id !== (action.payload as any).id);
        state.error = null;
      })
      .addCase(deleteBuyingGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchBuyingGroupDomains.pending, (state) => {
        state.isLoadingDomains = true;
        state.error = null;
      })
      .addCase(fetchBuyingGroupDomains.fulfilled, (state, action) => {
        state.isLoadingDomains = false;
        state.selectedGroupDomains = (action.payload as BuyingGroupDomain[]) || [];
      })
      .addCase(fetchBuyingGroupDomains.rejected, (state, action) => {
        state.isLoadingDomains = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(upsertBuyingGroupDomain.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteBuyingGroupDomain.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedGroup } = buyingGroupsSlice.actions;
export default buyingGroupsSlice.reducer;
