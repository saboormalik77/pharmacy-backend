import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface MarketplaceCategory {
  count: number;
  label: string;
  value: string;
}

export interface MarketplaceDeal {
  id: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  originalPrice: number;
  dealPrice: number;
  distributor: string;
  expiryDate: string;
  status: 'active' | 'sold' | 'expired';
  postedDate: string;
  imageUrl?: string;
  isDealOfTheDay?: boolean;
  dealOfTheDayUntil?: string | null;
  minimumBuyQuantity?: number;
}

export interface CategoriesResponse {
  status: string;
  data: {
    categories: MarketplaceCategory[];
  };
}

export interface MarketplaceResponse {
  status: string;
  data: {
    deals: MarketplaceDeal[];
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface UpdateDealPayload {
  productName?: string;
  category?: string;
  quantity?: number;
  minimumBuyQuantity?: number;
  unit?: string;
  originalPrice?: number;
  dealPrice?: number;
  distributor?: string;
  expiryDate?: string;
  status?: 'active' | 'sold' | 'expired';
  image?: File;
}

export interface CreateDealPayload {
  productName: string;
  category: string;
  quantity: number;
  minimumBuyQuantity: number;
  unit: string;
  originalPrice: number;
  dealPrice: number;
  distributor: string;
  expiryDate: string;
  image?: File;
}

export interface MarketplaceState {
  categories: MarketplaceCategory[];
  deals: MarketplaceDeal[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null;
  isLoadingCategories: boolean;
  isLoadingDeals: boolean;
  isCreatingDeal: boolean;
  isUpdatingDeal: boolean;
  isDeletingDeal: boolean;
  isSettingDealOfTheDay: boolean;
  isUnsettingDealOfTheDay: boolean;
  error: string | null;
}

const initialState: MarketplaceState = {
  categories: [],
  deals: [],
  pagination: null,
  isLoadingCategories: false,
  isLoadingDeals: false,
  isCreatingDeal: false,
  isUpdatingDeal: false,
  isDeletingDeal: false,
  isSettingDealOfTheDay: false,
  isUnsettingDealOfTheDay: false,
  error: null,
};

export interface FetchMarketplaceParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'sold' | 'expired';
  sortBy?: 'product_name' | 'category' | 'distributor' | 'status' | 'posted_date' | 'expiry_date' | 'deal_price' | 'quantity';
  sortOrder?: 'asc' | 'desc';
}

// Async thunk for fetching categories
export const fetchCategories = createAsyncThunk(
  'marketplace/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      const data: CategoriesResponse = await apiClient.get<CategoriesResponse>(
        '/admin/marketplace/categories',
        true
      );

      return data.data.categories;
    } catch (error: any) {
      console.error('Error fetching categories:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while fetching categories';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for fetching marketplace deals
export const fetchMarketplaceDeals = createAsyncThunk(
  'marketplace/fetchDeals',
  async (params: FetchMarketplaceParams = {}, { rejectWithValue }) => {
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

      // Set defaults
      queryParams.page = params.page ?? 1;
      queryParams.limit = params.limit ?? 12;
      queryParams.sortBy = params.sortBy ?? 'posted_date';
      queryParams.sortOrder = params.sortOrder ?? 'desc';

      if (params.search) {
        queryParams.search = params.search;
      }
      if (params.category && params.category !== 'all') {
        queryParams.category = params.category;
      }
      if (params.status && params.status !== 'all') {
        queryParams.status = params.status;
      }

      const data: MarketplaceResponse = await apiClient.get<MarketplaceResponse>(
        '/admin/marketplace',
        true,
        queryParams
      );

      return {
        deals: data.data.deals,
        pagination: data.data.pagination || null,
      };
    } catch (error: any) {
      console.error('Error fetching marketplace deals:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while fetching marketplace deals';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating a marketplace deal
export const updateMarketplaceDeal = createAsyncThunk(
  'marketplace/updateDeal',
  async ({ id, payload }: { id: string; payload: UpdateDealPayload }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      // If image is provided, use FormData, otherwise use JSON
      if (payload.image) {
        const formData = new FormData();
        if (payload.productName) formData.append('productName', payload.productName);
        if (payload.category) formData.append('category', payload.category);
        if (payload.quantity !== undefined) formData.append('quantity', payload.quantity.toString());
        if (payload.minimumBuyQuantity !== undefined) formData.append('minimumBuyQuantity', payload.minimumBuyQuantity.toString());
        if (payload.unit) formData.append('unit', payload.unit);
        if (payload.originalPrice !== undefined) formData.append('originalPrice', payload.originalPrice.toString());
        if (payload.dealPrice !== undefined) formData.append('dealPrice', payload.dealPrice.toString());
        if (payload.distributor) formData.append('distributor', payload.distributor);
        if (payload.expiryDate) formData.append('expiryDate', payload.expiryDate);
        if (payload.status) formData.append('status', payload.status);
        formData.append('image', payload.image);

        const response = await apiClient.patchFormData<{ status: string; data: { deal: MarketplaceDeal } }>(
          `/admin/marketplace/${id}`,
          formData,
          true
        );

        return response.data.deal;
      } else {
      const response = await apiClient.patch<{ status: string; data: { deal: MarketplaceDeal } }>(
        `/admin/marketplace/${id}`,
        payload,
        true
      );

      return response.data.deal;
      }
    } catch (error: any) {
      console.error('Error updating marketplace deal:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while updating the deal';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for creating a marketplace deal
export const createMarketplaceDeal = createAsyncThunk(
  'marketplace/createDeal',
  async (payload: CreateDealPayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('productName', payload.productName);
      formData.append('category', payload.category);
      formData.append('quantity', payload.quantity.toString());
      formData.append('minimumBuyQuantity', payload.minimumBuyQuantity.toString());
      formData.append('unit', payload.unit);
      formData.append('originalPrice', payload.originalPrice.toString());
      formData.append('dealPrice', payload.dealPrice.toString());
      formData.append('distributor', payload.distributor);
      formData.append('expiryDate', payload.expiryDate);
      
      // Add image if provided
      if (payload.image) {
        formData.append('image', payload.image);
      }
      
      const response = await apiClient.postFormData<{ status: string; data: { deal: MarketplaceDeal } }>(
        '/admin/marketplace',
        formData,
        true
      );

      return response.data.deal;
    } catch (error: any) {
      console.error('Error creating marketplace deal:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while creating the deal';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for deleting a marketplace deal
export const deleteMarketplaceDeal = createAsyncThunk(
  'marketplace/deleteDeal',
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
        `/admin/marketplace/${id}`,
        true
      );

      return id;
    } catch (error: any) {
      console.error('Error deleting marketplace deal:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while deleting the deal';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for setting deal of the day
export const setDealOfTheDay = createAsyncThunk(
  'marketplace/setDealOfTheDay',
  async ({ id, expiresAt }: { id: string; expiresAt: string }, { rejectWithValue }) => {
    try {
      const { cookieUtils } = await import('@/lib/utils/cookies');
      
      // Check if token exists before making the call
      const token = cookieUtils.getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return rejectWithValue('Authentication required. Please login again.');
      }

      console.log('Setting deal of the day with token:', token.substring(0, 20) + '...');

      // Make direct fetch call to ensure fresh token is used
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${baseUrl}/admin/marketplace/deals/${id}/set-deal-of-the-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ expiresAt })
      });

      const responseData = await response.json();
      console.log('Set deal of the day response:', responseData);

      if (!response.ok) {
        const errorMessage = responseData?.message || `Error: ${response.status}`;
        console.error('API error:', errorMessage);
        return rejectWithValue(errorMessage);
      }

      // Handle different response structures
      if (responseData && responseData.data) {
        if (responseData.data.deal) {
          return responseData.data.deal;
        } else if (Array.isArray(responseData.data) && responseData.data.length > 0) {
          return responseData.data[0] as MarketplaceDeal;
        } else if (typeof responseData.data === 'object' && 'id' in responseData.data) {
          return responseData.data as unknown as MarketplaceDeal;
        }
      }
      
      console.warn('Unexpected response structure for set deal of the day:', responseData);
      return responseData as unknown as MarketplaceDeal;
    } catch (error: any) {
      console.error('Error setting deal of the day:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while setting deal of the day';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for unsetting deal of the day
export const unsetDealOfTheDay = createAsyncThunk(
  'marketplace/unsetDealOfTheDay',
  async (_, { rejectWithValue }) => {
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
        `/admin/marketplace/deal-of-the-day`,
        true
      );

      return true;
    } catch (error: any) {
      console.error('Error unsetting deal of the day:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      });
      
      const errorMessage = error?.message || error?.data?.message || 'An error occurred while unsetting deal of the day';
      return rejectWithValue(errorMessage);
    }
  }
);

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoadingCategories = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<MarketplaceCategory[]>) => {
        state.isLoadingCategories = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoadingCategories = false;
        state.error = action.payload as string;
      });

    // Fetch marketplace deals
    builder
      .addCase(fetchMarketplaceDeals.pending, (state) => {
        state.isLoadingDeals = true;
        state.error = null;
      })
      .addCase(fetchMarketplaceDeals.fulfilled, (state, action) => {
        state.isLoadingDeals = false;
        state.deals = action.payload.deals;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchMarketplaceDeals.rejected, (state, action) => {
        state.isLoadingDeals = false;
        state.error = action.payload as string;
      });

    // Create marketplace deal
    builder
      .addCase(createMarketplaceDeal.pending, (state) => {
        state.isCreatingDeal = true;
        state.error = null;
      })
      .addCase(createMarketplaceDeal.fulfilled, (state, action) => {
        state.isCreatingDeal = false;
        if (action.payload) {
          state.deals.unshift(action.payload);
        }
        state.error = null;
      })
      .addCase(createMarketplaceDeal.rejected, (state, action) => {
        state.isCreatingDeal = false;
        state.error = action.payload as string;
      });

    // Update marketplace deal
    builder
      .addCase(updateMarketplaceDeal.pending, (state) => {
        state.isUpdatingDeal = true;
        state.error = null;
      })
      .addCase(updateMarketplaceDeal.fulfilled, (state, action) => {
        state.isUpdatingDeal = false;
        if (action.payload) {
          const index = state.deals.findIndex(deal => deal.id === action.payload!.id);
          if (index !== -1) {
            state.deals[index] = action.payload;
          }
        }
        state.error = null;
      })
      .addCase(updateMarketplaceDeal.rejected, (state, action) => {
        state.isUpdatingDeal = false;
        state.error = action.payload as string;
      });

    // Delete marketplace deal
    builder
      .addCase(deleteMarketplaceDeal.pending, (state) => {
        state.isDeletingDeal = true;
        state.error = null;
      })
      .addCase(deleteMarketplaceDeal.fulfilled, (state, action) => {
        state.isDeletingDeal = false;
        state.deals = state.deals.filter(deal => deal.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteMarketplaceDeal.rejected, (state, action) => {
        state.isDeletingDeal = false;
        state.error = action.payload as string;
      });

    // Set deal of the day
    builder
      .addCase(setDealOfTheDay.pending, (state) => {
        state.isSettingDealOfTheDay = true;
        state.error = null;
      })
      .addCase(setDealOfTheDay.fulfilled, (state, action) => {
        state.isSettingDealOfTheDay = false;
        // First, unset all deals' isDealOfTheDay to false
        state.deals = state.deals.map(deal => ({
          ...deal,
          isDealOfTheDay: false,
          dealOfTheDayUntil: null
        }));
        // Then update the deal that was set as deal of the day
        const updatedDeal = action.payload;
        const dealIndex = state.deals.findIndex(d => d.id === updatedDeal.id);
        if (dealIndex !== -1) {
          state.deals[dealIndex] = updatedDeal;
        } else {
          // If deal not found in current list, add it (shouldn't happen but just in case)
          state.deals.push(updatedDeal);
        }
        state.error = null;
      })
      .addCase(setDealOfTheDay.rejected, (state, action) => {
        state.isSettingDealOfTheDay = false;
        state.error = action.payload as string;
      });

    // Unset deal of the day
    builder
      .addCase(unsetDealOfTheDay.pending, (state) => {
        state.isUnsettingDealOfTheDay = true;
        state.error = null;
      })
      .addCase(unsetDealOfTheDay.fulfilled, (state) => {
        state.isUnsettingDealOfTheDay = false;
        // Set all deals' isDealOfTheDay to false
        state.deals.forEach((deal, index) => {
          if (deal.isDealOfTheDay) {
            state.deals[index] = { ...deal, isDealOfTheDay: false, dealOfTheDayUntil: null };
          }
        });
        state.error = null;
      })
      .addCase(unsetDealOfTheDay.rejected, (state, action) => {
        state.isUnsettingDealOfTheDay = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = marketplaceSlice.actions;
export default marketplaceSlice.reducer;

