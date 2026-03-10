import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Activity {
  id: string;
  activityType: string;
  entityId: string;
  entityName: string;
  metadata?: Record<string, any>;
  createdAt: string;
  isRead?: boolean;
  pharmacy?: {
    id: string;
    name: string;
    pharmacyName: string;
    email: string;
  };
}

export interface RecentActivityResponse {
  status: string;
  data: {
    activities: Activity[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    stats?: {
      todayCount: number;
      thisWeekCount: number;
      totalCount: number;
    };
    filters?: {
      activityType?: string;
      pharmacyId?: string;
    };
    generatedAt: string;
  };
}

export interface RecentActivityState {
  activities: Activity[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RecentActivityState = {
  activities: [],
  pagination: null,
  isLoading: false,
  error: null,
};

export interface FetchRecentActivityParams {
  limit?: number;
  offset?: number;
  activityType?: string;
  pharmacyId?: string;
}

// Async thunk for fetching recent activity
export const fetchRecentActivity = createAsyncThunk(
  'recentActivity/fetch',
  async (params: FetchRecentActivityParams = {}, { rejectWithValue }) => {
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

      if (params.limit !== undefined) {
        queryParams.limit = params.limit;
      }
      if (params.offset !== undefined) {
        queryParams.offset = params.offset;
      }
      if (params.activityType) {
        queryParams.activityType = params.activityType;
      }
      if (params.pharmacyId) {
        queryParams.pharmacyId = params.pharmacyId;
      }

      const data: RecentActivityResponse = await apiClient.get<RecentActivityResponse>(
        '/admin/recent-activity',
        true,
        queryParams
      );

      return data.data;
    } catch (error: any) {
      console.error('Error fetching recent activity:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while fetching recent activity';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for marking activity as read
export const markActivityAsRead = createAsyncThunk(
  'recentActivity/markAsRead',
  async (activityId: string, { rejectWithValue, dispatch }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      // Try sending activityId to mark just that one, or empty body to mark all
      const response = await apiClient.post<{ 
        success: boolean; 
        message: string; 
        updatedCount: number; 
        markedAt: string;
      }>(
        '/admin/recent-activity/mark-all-read',
        activityId ? { activityId } : {},
        true
      );

      // Refresh activities to get updated isRead status
      await dispatch(fetchRecentActivity({ limit: 20, offset: 0 }));

      return { activityId, response };
    } catch (error: any) {
      console.error('Error marking activity as read:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while marking activity as read';
      return rejectWithValue(errorMessage);
    }
  }
);

const recentActivitySlice = createSlice({
  name: 'recentActivity',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecentActivity.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activities = action.payload.activities;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchRecentActivity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(markActivityAsRead.fulfilled, (state, action) => {
        // If the API marks all activities, update all to isRead: true
        // Otherwise, the fetchRecentActivity call will update the state
        const payload = action.payload as { activityId: string; response: { updatedCount: number } };
        if (payload?.response?.updatedCount > 0) {
          // If multiple were updated, mark all as read
          state.activities.forEach(activity => {
            activity.isRead = true;
          });
        } else if (payload?.activityId) {
          // If only one was updated, mark just that one
          const activityIndex = state.activities.findIndex((a) => a.id === payload.activityId);
          if (activityIndex !== -1) {
            state.activities[activityIndex].isRead = true;
          }
        }
      });
  },
});

export const { clearError } = recentActivitySlice.actions;
export default recentActivitySlice.reducer;

