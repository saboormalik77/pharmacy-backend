/**
 * API Client utility for making HTTP requests
 * This can be extended for other API calls throughout the application
 */

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

  /**
   * Get authorization token from cookies
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return cookieUtils.getAuthToken();
    }
    return null;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(includeAuth: boolean = true, isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {};

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle token expiration - clear auth and redirect to login
   */
  private handleTokenExpiration() {
    if (typeof window !== 'undefined') {
      // Clear auth cookies
      cookieUtils.clearAuth();
      
      // Redirect to login page
      window.location.href = '/login';
    }
  }

  /**
   * Check if error indicates token expiration
   * Only treat as token expiration if we have a token (not during login)
   * Be specific to avoid logging out users for other 401 errors
   */
  private isTokenExpiredError(status: number, errorData: any, endpoint?: string): boolean {
    // Don't treat login endpoint errors as token expiration
    if (endpoint && endpoint.includes('/auth/login')) {
      return false;
    }
    
    // Check for specific error messages that indicate token expiration
    // Be careful not to include general validation errors like "invalid signature"
    const errorMessage = errorData?.message?.toLowerCase() || '';
    const isTokenExpiredMessage = 
      errorMessage.includes('expired token') ||
      errorMessage.includes('jwt expired') ||
      errorMessage.includes('token has expired') ||
      errorMessage.includes('session expired') ||
      errorData?.message === 'Invalid or expired token';
    
    // Only treat as token expiration if 401 AND the message indicates token issue
    if (status === 401 && isTokenExpiredMessage) {
      return true;
    }
    
    // If status is 401 but no specific token message, don't treat as token expiration
    // This prevents logout for other authorization errors (e.g., permission denied)
    
    return false;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response, endpoint?: string): Promise<T> {
    // Read response body once
    const responseData = await response.json().catch(() => {
      // If JSON parsing fails, return a default error structure
      return { message: `HTTP error! status: ${response.status}` };
    });

    // Check if token is expired (check both status code and response body)
    // Only treat as token expiration if we have a token and it's not a login endpoint
    if (this.isTokenExpiredError(response.status, responseData, endpoint)) {
      this.handleTokenExpiration();
      const error: ApiError = {
        message: 'Session expired. Please login again.',
        status: 401, // Always set to 401 for token expiration
        data: responseData,
      };
      throw error;
    }

    // If response is not ok, throw error
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

  /**
   * Build query string from params object
   */
  private buildQueryString(params: Record<string, string | number | undefined>): string {
    const queryParts: string[] = [];
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Use encodeURIComponent to properly encode spaces as %20 instead of +
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(String(value));
        queryParts.push(`${encodedKey}=${encodedValue}`);
      }
    });
    const queryString = queryParts.join('&');
    return queryString ? `?${queryString}` : '';
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    includeAuth: boolean = true,
    queryParams?: Record<string, string | number | undefined>
  ): Promise<T> {
    const queryString = queryParams ? this.buildQueryString(queryParams) : '';
    const url = `${this.baseUrl}${endpoint}${queryString}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(includeAuth),
    });

    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth, true),
      body: formData,
    });

    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * PATCH request with FormData (for file uploads)
   */
  async patchFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(includeAuth, true),
      body: formData,
    });

    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth),
    });

    return this.handleResponse<T>(response, endpoint);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

