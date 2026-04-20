/**
 * Base API Client
 * Handles authentication, error handling, and request/response formatting
 */

import { getToken, getPharmacyId, clearAuthCookies } from '@/lib/utils/cookies';
import { authService } from './services/authService';
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pharmacy-backend-dusky.vercel.app/api';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
  total?: number;
}

export interface ApiError {
  status: number;
  message: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  /**
   * Handle token refresh for 401 errors
   * Prevents multiple simultaneous refresh attempts
   */
  private async handleTokenRefresh<T>(retryRequest: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T> | null> {
    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise<ApiResponse<T> | null>((resolve, reject) => {
        this.failedQueue.push({ 
          resolve: (value) => resolve(value as ApiResponse<T> | null), 
          reject 
        });
      }).then(() => {
        return retryRequest();
      }).catch((error) => {
        throw error;
      });
    }

    this.isRefreshing = true;

    try {
      const newToken = await authService.refreshAccessToken();
      
      if (newToken) {
        this.processQueue(null, newToken);
        // Retry the original request
        return await retryRequest();
      } else {
        // Refresh failed
        const error = new Error('Token refresh failed');
        this.processQueue(error, null);
        return null;
      }
    } catch (error) {
      this.processQueue(error, null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get authentication token from cookies
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return getToken();
  }

  /**
   * Check if JWT token is expired by decoding it
   * Note: This only checks expiration, doesn't verify signature
   */
  private isTokenExpired(token: string): boolean {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      // Decode payload (base64url)
      const payload = parts[1];
      // Replace URL-safe base64 characters
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const decoded = JSON.parse(atob(padded));
      
      // Check expiration (exp is in seconds, Date.now() is in milliseconds)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return true;
      }
      
      return false;
    } catch (error) {
      // If we can't decode, assume expired
      return true;
    }
  }

  /**
   * Check if token exists and redirect to login if missing
   * Note: We don't check token expiry here - let the server validate and use refresh flow
   */
  private checkAuthBeforeRequest(includeAuth: boolean, endpoint: string): void {
    if (typeof window === 'undefined') return;
    
    // Only check auth if auth is required and not on auth endpoints
    if (includeAuth && !endpoint.includes('/auth/')) {
      const token = this.getAuthToken();
      if (!token) {
        // No token at all, redirect immediately
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup') {
          usePharmacyContextStore.getState().startSignOut();
          clearAuthCookies();
          window.location.href = '/login';
        }
        // Throw error to stop request execution
        throw {
          status: 401,
          message: 'Authentication required',
        } as ApiError;
      }
    }
  }

  /**
   * Get pharmacy ID from cookies
   */
  private getPharmacyIdFromCookies(): string | null {
    if (typeof window === 'undefined') return null;
    return getPharmacyId();
  }

  /**
   * Get current hostname so the backend can resolve the tenant.
   */
  private getTenantDomain(): string | null {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return window.location.hostname;
    }
    return null;
  }

  /**
   * Build headers for API requests
   */
  private getHeaders(includeAuth: boolean = true, customHeaders?: Record<string, string>): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const tenantDomain = this.getTenantDomain();
    if (tenantDomain) {
      headers['X-Tenant-Domain'] = tenantDomain;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<ApiError> {
    let errorMessage = 'An error occurred';
    let errorData: any = {};

    try {
      // Read response as text first (can only read once)
      const text = await response.text();
      
      if (!text || text.trim().length === 0) {
        errorMessage = response.statusText || errorMessage;
      } else {
        try {
          // Try to parse as JSON
          errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If not JSON, use the text as error message
          errorMessage = text || response.statusText || errorMessage;
        }
      }
    } catch (error: any) {
      // If all else fails, use status text
      errorMessage = response.statusText || errorMessage;
    }

    return {
      status: response.status,
      message: errorMessage,
      error: errorData.error,
    };
  }

  /**
   * Make a GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    // Check token before making request - redirect immediately if missing
    this.checkAuthBeforeRequest(includeAuth, endpoint);
    
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add pharmacy_id to params if available
    const pharmacyId = this.getPharmacyIdFromCookies();
    if (pharmacyId && includeAuth) {
      url.searchParams.append('pharmacy_id', pharmacyId);
    }

    // Add other params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(includeAuth),
      });

      if (!response.ok) {
        // Handle token expiration (401) - try to refresh token
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
          // Try to refresh token and retry request
          const retryResponse = await this.handleTokenRefresh<T>(() => 
            this.get<T>(endpoint, params, includeAuth)
          );
          if (retryResponse) {
            return retryResponse;
          }
          // If refresh failed, error will be thrown below
        }
        
        // Handle other errors or if refresh failed
        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          // Clear auth cookies and redirect to login
          if (typeof window !== 'undefined') {
            usePharmacyContextStore.getState().startSignOut();
            clearAuthCookies();
            window.location.href = '/login';
          }
        }
        const error = await this.handleError(response);
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }


  async getApiWithoutPharmacyId<T>(
    endpoint: string,
    params?: Record<string, any>,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    // Check token before making request - redirect immediately if missing
    this.checkAuthBeforeRequest(includeAuth, endpoint);
    
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add pharmacy_id to params if available
    const pharmacyId = this.getPharmacyIdFromCookies();
    // if (pharmacyId && includeAuth) {
    //   url.searchParams.append('pharmacy_id', pharmacyId);
    // }

    // Add other params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(includeAuth),
      });

      if (!response.ok) {
        // Handle token expiration (401) - try to refresh token
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
          // Try to refresh token and retry request
          const retryResponse = await this.handleTokenRefresh<T>(() => 
            this.getApiWithoutPharmacyId<T>(endpoint, params, includeAuth)
          );
          if (retryResponse) {
            return retryResponse;
          }
          // If refresh failed, error will be thrown below
        }
        
        // Handle other errors or if refresh failed
        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          // Clear auth cookies and redirect to login
          if (typeof window !== 'undefined') {
            usePharmacyContextStore.getState().startSignOut();
            clearAuthCookies();
            window.location.href = '/login';
          }
        }
        const error = await this.handleError(response);
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a POST request
   */
  async post<T>(
    endpoint: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    // Check token before making request - redirect immediately if missing
    this.checkAuthBeforeRequest(includeAuth, endpoint);
    
    const url = `${this.baseURL}${endpoint}`;
    
    // Add pharmacy_id to body if available
    const requestBody = body || {};
    const pharmacyId = this.getPharmacyIdFromCookies();
    if (pharmacyId && includeAuth && typeof requestBody === 'object' && !Array.isArray(requestBody)) {
      requestBody.pharmacy_id = pharmacyId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(includeAuth),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle token expiration (401) - try to refresh token
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
          // Try to refresh token and retry request
          const retryResponse = await this.handleTokenRefresh<T>(() => 
            this.post<T>(endpoint, body, includeAuth)
          );
          if (retryResponse) {
            return retryResponse;
          }
          // If refresh failed, error will be thrown below
        }
        
        // Handle other errors or if refresh failed
        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          // Clear auth cookies and redirect to login
          if (typeof window !== 'undefined') {
            usePharmacyContextStore.getState().startSignOut();
            clearAuthCookies();
            window.location.href = '/login';
          }
        }
        const error = await this.handleError(response);
        throw error;
      }

      // Read response as text first, then try to parse as JSON
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        return { status: 'success' } as ApiResponse<T>;
      }
      
      try {
        const data = JSON.parse(text);
        return data;
      } catch (parseError: any) {
        // If response is not valid JSON, it's likely an error
        throw {
          status: 500,
          message: `Server returned non-JSON response: ${text.substring(0, 200)}`,
        } as ApiError;
      }
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      // Handle JSON parsing errors specifically
      if (error.message && error.message.includes('JSON')) {
        throw {
          status: 500,
          message: `Failed to parse server response: ${error.message}`,
        } as ApiError;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a PUT request
   */
  async put<T>(
    endpoint: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    // Check token before making request - redirect immediately if missing
    this.checkAuthBeforeRequest(includeAuth, endpoint);
    
    const url = `${this.baseURL}${endpoint}`;
    
    // Add pharmacy_id to body if available
    const requestBody = body || {};
    const pharmacyId = this.getPharmacyIdFromCookies();
    if (pharmacyId && includeAuth && typeof requestBody === 'object' && !Array.isArray(requestBody)) {
      requestBody.pharmacy_id = pharmacyId;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(includeAuth),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle token expiration (401) - try to refresh token
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
          // Try to refresh token and retry request
          const retryResponse = await this.handleTokenRefresh<T>(() => 
            this.put<T>(endpoint, body, includeAuth)
          );
          if (retryResponse) {
            return retryResponse;
          }
          // If refresh failed, error will be thrown below
        }
        
        // Handle other errors or if refresh failed
        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          // Clear auth cookies and redirect to login
          if (typeof window !== 'undefined') {
            usePharmacyContextStore.getState().startSignOut();
            clearAuthCookies();
            window.location.href = '/login';
          }
        }
        const error = await this.handleError(response);
        throw error;
      }

      // Read response as text first, then try to parse as JSON
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        return { status: 'success' } as ApiResponse<T>;
      }
      
      try {
        const data = JSON.parse(text);
        return data;
      } catch (parseError: any) {
        // If response is not valid JSON, it's likely an error
        throw {
          status: 500,
          message: `Server returned non-JSON response: ${text.substring(0, 200)}`,
        } as ApiError;
      }
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      // Handle JSON parsing errors specifically
      if (error.message && error.message.includes('JSON')) {
        throw {
          status: 500,
          message: `Failed to parse server response: ${error.message}`,
        } as ApiError;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    // Check token before making request - redirect immediately if missing
    this.checkAuthBeforeRequest(includeAuth, endpoint);
    
    const url = `${this.baseURL}${endpoint}`;
    
    // Add pharmacy_id to body if available
    const requestBody = body || {};
    const pharmacyId = this.getPharmacyIdFromCookies();
    if (pharmacyId && includeAuth && typeof requestBody === 'object' && !Array.isArray(requestBody)) {
      requestBody.pharmacy_id = pharmacyId;
    }

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(includeAuth),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle token expiration (401) - try to refresh token
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
          // Try to refresh token and retry request
          const retryResponse = await this.handleTokenRefresh<T>(() => 
            this.patch<T>(endpoint, body, includeAuth)
          );
          if (retryResponse) {
            return retryResponse;
          }
          // If refresh failed, error will be thrown below
        }
        
        // Handle other errors or if refresh failed
        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          // Clear auth cookies and redirect to login
          if (typeof window !== 'undefined') {
            usePharmacyContextStore.getState().startSignOut();
            clearAuthCookies();
            window.location.href = '/login';
          }
        }
        const error = await this.handleError(response);
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(
    endpoint: string,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    // Check token before making request - redirect immediately if missing
    this.checkAuthBeforeRequest(includeAuth, endpoint);
    
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(includeAuth),
      });

      if (!response.ok) {
        // Handle token expiration (401) - try to refresh token
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
          // Try to refresh token and retry request
          const retryResponse = await this.handleTokenRefresh<T>(() => 
            this.delete<T>(endpoint, includeAuth)
          );
          if (retryResponse) {
            return retryResponse;
          }
          // If refresh failed, error will be thrown below
        }
        
        // Handle other errors or if refresh failed
        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          // Clear auth cookies and redirect to login
          if (typeof window !== 'undefined') {
            usePharmacyContextStore.getState().startSignOut();
            clearAuthCookies();
            window.location.href = '/login';
          }
        }
        const error = await this.handleError(response);
        throw error;
      }

      // DELETE might return 204 No Content
      if (response.status === 204) {
        return { status: 'success' } as ApiResponse<T>;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Upload a file (multipart/form-data)
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    // Check token before making request - redirect immediately if missing
    this.checkAuthBeforeRequest(includeAuth, endpoint);
    
    const url = `${this.baseURL}${endpoint}`;
    
    // Add pharmacy_id to formData if available
    const pharmacyId = this.getPharmacyIdFromCookies();
    if (pharmacyId && includeAuth) {
      formData.append('pharmacy_id', pharmacyId);
    }

    const headers: HeadersInit = {};
    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    const tenantDomain = this.getTenantDomain();
    if (tenantDomain) {
      headers['X-Tenant-Domain'] = tenantDomain;
    }
    // Don't set Content-Type for FormData, browser will set it with boundary

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        // Handle token expiration (401) - try to refresh token
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
          // Try to refresh token and retry request
          const retryResponse = await this.handleTokenRefresh<T>(() => 
            this.upload<T>(endpoint, formData, includeAuth)
          );
          if (retryResponse) {
            return retryResponse;
          }
          // If refresh failed, error will be thrown below
        }
        
        // Handle other errors or if refresh failed
        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          // Clear auth cookies and redirect to login
          if (typeof window !== 'undefined') {
            usePharmacyContextStore.getState().startSignOut();
            clearAuthCookies();
            window.location.href = '/login';
          }
        }
        const error = await this.handleError(response);
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

