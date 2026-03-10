import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  DocumentsResponse, 
  Document, 
  DocumentsStats
} from '@/lib/types';

export interface DocumentsState {
  documents: Document[];
  stats: DocumentsStats | null;
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

const initialState: DocumentsState = {
  documents: [],
  stats: null,
  pagination: null,
  filters: {
    search: '',
    pharmacyId: '',
  },
  isLoading: false,
  error: null,
};

export interface FetchDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  pharmacy_id?: string;
}

// Async thunk for fetching documents
export const fetchDocuments = createAsyncThunk(
  'documents/fetch',
  async (params: FetchDocumentsParams = {}, { rejectWithValue }) => {
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
      if (params.pharmacy_id) {
        queryParams.pharmacy_id = params.pharmacy_id;
      }

      console.log('Fetching documents with params:', queryParams);
      const data: DocumentsResponse = await apiClient.get<DocumentsResponse>(
        '/admin/documents',
        true,
        queryParams
      );

      return data.data;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error fetching documents:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      // Don't redirect on non-auth errors - let the component handle it
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while fetching documents';
      
      // Only reject with value, don't throw - this prevents automatic redirects
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for deleting a document
export const deleteDocument = createAsyncThunk(
  'documents/delete',
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
      
      console.log('Deleting document with id:', id);
      await apiClient.delete<{ status: string; message?: string }>(
        `/admin/documents/${id}`,
        true
      );

      return id;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error deleting document:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while deleting the document';
      
      return rejectWithValue(errorMessage);
    }
  }
);

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<DocumentsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch documents
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.documents = action.payload.documents;
        state.stats = action.payload.stats;
        
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
        
        // Update filters from response
        if (action.payload.filters) {
          state.filters = {
            search: action.payload.filters.search || '',
            pharmacyId: action.payload.filters.pharmacyId || '',
          };
        }
        
        state.error = null;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete document
      .addCase(deleteDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.isLoading = false;
        // Remove deleted document from state
        state.documents = state.documents.filter(doc => doc.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearError } = documentsSlice.actions;
export default documentsSlice.reducer;

