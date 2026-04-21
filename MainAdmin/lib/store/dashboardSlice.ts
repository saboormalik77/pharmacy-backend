import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DashboardResponse, PeriodType } from '@/lib/types';

export interface DashboardState {
  data: DashboardResponse['data'] | null;
  isLoading: boolean;
  error: string | null;
  selectedPharmacyId: string | null;
  selectedPeriodType: PeriodType;
}

const initialState: DashboardState = {
  data: null,
  isLoading: false,
  error: null,
  selectedPharmacyId: null,
  selectedPeriodType: 'monthly',
};

export interface FetchDashboardParams {
  pharmacyId?: string;
  periodType?: PeriodType;
  periods?: number;
}

// Async thunk for fetching dashboard data
export const fetchDashboard = createAsyncThunk(
  'dashboard/fetch',
  async (params: FetchDashboardParams = {}, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const queryParams: Record<string, string | number | undefined> = {
        periods: params.periods || 12,
      };

      if (params.pharmacyId) {
        queryParams.pharmacyId = params.pharmacyId;
      }

      if (params.periodType) {
        queryParams.periodType = params.periodType;
      }

      const data: DashboardResponse = await apiClient.get<DashboardResponse>(
        '/admin/dashboard',
        true,
        queryParams
      );

      return data.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while fetching dashboard data';
      return rejectWithValue(errorMessage);
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setSelectedPharmacy: (state, action: PayloadAction<string | null>) => {
      state.selectedPharmacyId = action.payload;
    },
    setSelectedPeriodType: (state, action: PayloadAction<PeriodType>) => {
      state.selectedPeriodType = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedPharmacy, setSelectedPeriodType, clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
