import { apiClient } from '../client';

export interface WineCellarItem {
  id: string;
  pharmacyId: string;
  pharmacyName: string | null;
  transactionItemId: string | null;
  ndc: string | null;
  ndc10: string | null;
  productName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  standardPrice: number | null;
  estimatedValue: number | null;
  isPartial: boolean;
  partialPercentage: number | null;
  dateShelved: string;
  expectedReturnableDate: string | null;
  physicalLocation: string | null;
  baggieBarcode: string | null;
  status: 'shelved' | 'ready_to_return' | 'returned' | 'destroyed';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WineCellarStats {
  totalItems: number;
  shelved: number;
  readyToReturn: number;
  returned: number;
  destroyed: number;
  totalValue: number;
}

export interface WineCellarListResponse {
  items: WineCellarItem[];
  summary: {
    totalItems: number;
    totalShelved: number;
    totalReady: number;
    totalValue: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WineCellarFilters {
  status?: string;
  search?: string;
  expected_month?: string;
  page?: number;
  limit?: number;
}

export const wineCellarService = {
  async list(filters?: WineCellarFilters): Promise<WineCellarListResponse> {
    const query: Record<string, string> = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.search) query.search = filters.search;
    if (filters?.expected_month) query.expected_month = filters.expected_month;
    if (filters?.page) query.page = String(filters.page);
    if (filters?.limit) query.limit = String(filters.limit);

    const qs = Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const url = qs ? `/wine-cellar?${qs}` : '/wine-cellar';

    const response = await apiClient.get<WineCellarListResponse>(url);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch wine cellar items');
  },

  async stats(): Promise<WineCellarStats> {
    const response = await apiClient.get<WineCellarStats>('/wine-cellar/stats');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch wine cellar stats');
  },
};
