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
  // Notifications (for Navbar)
  notifications: Activity[];
  notificationsPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
  isLoadingNotifications: boolean;
  
  // Recent Activity (for Dashboard)
  recentActivity: Activity[];
  recentActivityPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
  isLoadingRecentActivity: boolean;
  
  error: string | null;
}

const initialState: RecentActivityState = {
  notifications: [],
  notificationsPagination: null,
  isLoadingNotifications: false,
  recentActivity: [],
  recentActivityPagination: null,
  isLoadingRecentActivity: false,
  error: null,
};

export interface FetchRecentActivityParams {
  limit?: number;
  offset?: number;
  activityType?: string;
  pharmacyId?: string;
  filter?: string;
}

// Async thunk for fetching recent activity
export const fetchRecentActivity = createAsyncThunk(
  'recentActivity/fetch',
  async (params: FetchRecentActivityParams = {}, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      const token = cookieUtils.getAuthToken();
      if (!token) {
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
      if (params.filter) {
        queryParams.filter = params.filter;
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
      
      const token = cookieUtils.getAuthToken();
      if (!token) {
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
      // Using 'notifications' filter since markActivityAsRead is called from Navbar
      await dispatch(fetchRecentActivity({ limit: 20, offset: 0, filter: 'notifications' }));

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
      .addCase(fetchRecentActivity.pending, (state, action) => {
        // Determine which state to update based on filter
        const filter = action.meta.arg?.filter;
        if (filter === 'notifications') {
          state.isLoadingNotifications = true;
        } else {
          state.isLoadingRecentActivity = true;
        }
        state.error = null;
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        // Determine which state to update based on filter
        const filter = action.meta.arg?.filter;
        if (filter === 'notifications') {
          state.isLoadingNotifications = false;
          state.notifications = action.payload.activities;
          state.notificationsPagination = action.payload.pagination;
        } else {
          state.isLoadingRecentActivity = false;
          state.recentActivity = action.payload.activities;
          state.recentActivityPagination = action.payload.pagination;
        }
        state.error = null;
      })
      .addCase(fetchRecentActivity.rejected, (state, action) => {
        // Determine which state to update based on filter
        const filter = action.meta.arg?.filter;
        if (filter === 'notifications') {
          state.isLoadingNotifications = false;
        } else {
          state.isLoadingRecentActivity = false;
        }
        state.error = action.payload as string;
      })
      .addCase(markActivityAsRead.fulfilled, (state, action) => {
        // If the API marks all activities, update all to isRead: true
        // Otherwise, the fetchRecentActivity call will update the state
        const payload = action.payload as { activityId: string; response: { updatedCount: number } };
        if (payload?.response?.updatedCount > 0) {
          // If multiple were updated, mark all notifications as read
          state.notifications.forEach(activity => {
            activity.isRead = true;
          });
        } else if (payload?.activityId) {
          // If only one was updated, mark just that one in notifications
          const activityIndex = state.notifications.findIndex((a) => a.id === payload.activityId);
          if (activityIndex !== -1) {
            state.notifications[activityIndex].isRead = true;
          }
        }
      });
  },
});

export const { clearError } = recentActivitySlice.actions;
export default recentActivitySlice.reducer;

