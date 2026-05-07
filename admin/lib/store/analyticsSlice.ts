import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AnalyticsResponse, AnalyticsData } from '@/lib/types';

export interface AnalyticsState {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  data: null,
  isLoading: false,
  error: null,
};

// Async thunk for fetching analytics
export const fetchAnalytics = createAsyncThunk(
  'analytics/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const data: AnalyticsResponse = await apiClient.get<AnalyticsResponse>(
        '/admin/analytics',
        true
      );

      return data.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while fetching analytics';
      return rejectWithValue(errorMessage);
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
