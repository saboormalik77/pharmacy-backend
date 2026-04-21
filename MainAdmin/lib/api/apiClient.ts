import { cookieUtils } from '@/lib/utils/cookies';

const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
};

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiUrl();
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return cookieUtils.getAuthToken();
    }
    return null;
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private handleTokenExpiration() {
    if (typeof window !== 'undefined') {
      cookieUtils.clearAuth();
      window.location.href = '/login';
    }
  }

  private isTokenExpiredError(status: number, _errorData: any, endpoint?: string): boolean {
    if (endpoint && endpoint.includes('/auth/login')) {
      return false;
    }
    if (!this.getAuthToken()) {
      return false;
    }
    return status === 401;
  }

  private async handleResponse<T>(response: Response, endpoint?: string): Promise<T> {
    const responseData = await response.json().catch(() => {
      return { message: `HTTP error! status: ${response.status}` };
    });

    if (this.isTokenExpiredError(response.status, responseData, endpoint)) {
      this.handleTokenExpiration();
      const error: ApiError = {
        message: 'Session expired. Please login again.',
        status: 401,
        data: responseData,
      };
      throw error;
    }

    if (!response.ok) {
      const error: ApiError = {
        message: responseData.message || 'An error occurred',
        status: response.status,
        data: responseData,
      };
      throw error;
    }

    return responseData as T;
  }

  private buildQueryString(params: Record<string, string | number | undefined>): string {
    const queryParts: string[] = [];
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    });
    return queryParts.length ? `?${queryParts.join('&')}` : '';
  }

  async get<T>(endpoint: string, includeAuth: boolean = true, queryParams?: Record<string, string | number | undefined>): Promise<T> {
    const queryString = queryParams ? this.buildQueryString(queryParams) : '';
    const response = await fetch(`${this.baseUrl}${endpoint}${queryString}`, {
      method: 'GET',
      headers: this.getHeaders(includeAuth),
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async post<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async postFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = true): Promise<T> {
    const headers: HeadersInit = {};
    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async put<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async patch<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async patchFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = true): Promise<T> {
    const headers: HeadersInit = {};
    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async delete<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth),
    });
    return this.handleResponse<T>(response, endpoint);
  }
}

export const apiClient = new ApiClient();
