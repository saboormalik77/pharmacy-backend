import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  PaymentsResponse, 
  Payment, 
  PaymentsStats
} from '@/lib/types';

export interface PaymentsState {
  payments: Payment[];
  stats: PaymentsStats | null;
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
    pharmacyId: string;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: PaymentsState = {
  payments: [],
  stats: null,
  pagination: null,
  filters: {
    search: '',
    pharmacyId: '',
  },
  isLoading: false,
  error: null,
};

export interface FetchPaymentsParams {
  page?: number;
  limit?: number;
  search?: string;
  pharmacyId?: string;
}

// Async thunk for fetching payments
export const fetchPayments = createAsyncThunk(
  'payments/fetch',
  async (params: FetchPaymentsParams = {}, { rejectWithValue }) => {
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
      if (params.pharmacyId) {
        queryParams.pharmacy_id = params.pharmacyId;
      }

      console.log('Fetching payments with params:', queryParams);
      const data: PaymentsResponse = await apiClient.get<PaymentsResponse>(
        '/admin/payments',
        true,
        queryParams
      );

      return data.data;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error fetching payments:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      // Don't redirect on non-auth errors - let the component handle it
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while fetching payments';
      
      // Only reject with value, don't throw - this prevents automatic redirects
      return rejectWithValue(errorMessage);
    }
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<PaymentsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch payments
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload.payments;
        state.stats = action.payload.stats;
        
        // Handle pagination - calculate hasNextPage/hasPreviousPage if not provided
        const pagination = action.payload.pagination;
        if (pagination) {
          state.pagination = {
            ...pagination,
            // Calculate hasNextPage/hasPreviousPage if not provided (like pharmacies API)
            hasNextPage: pagination.hasNextPage !== undefined 
              ? pagination.hasNextPage 
              : pagination.page < pagination.totalPages,
            hasPreviousPage: pagination.hasPreviousPage !== undefined 
              ? pagination.hasPreviousPage 
              : pagination.page > 1,
            // Support both 'total' and 'totalCount' field names
            totalCount: pagination.totalCount || (pagination as any).total || 0,
          };
        } else {
          state.pagination = null;
        }
        
        state.error = null;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearError } = paymentsSlice.actions;
export default paymentsSlice.reducer;
