# Frontend Refresh Token Implementation Guide

## Overview

This guide explains how to implement the refresh token mechanism on the frontend to handle automatic token refresh when access tokens expire.

## ⚠️ IMPORTANT: Custom Refresh Token System

This backend uses a **custom refresh token system** that is **independent of Supabase session expiry**. This means:

- **Access tokens** expire after **1 hour** (Supabase JWT)
- **Custom refresh tokens** expire after **30 days** (stored in our database)
- Refresh tokens are **rotated** on each use (one-time use for security)On 
- Refresh tokens start with the prefix `prt_` (pharmacy refresh token)

## API Endpoints

- **Login**: `POST /api/auth/signin`
- **Signup**: `POST /api/auth/signup`
- **Refresh Token**: `POST /api/auth/refresh`
- **Logout**: `POST /api/auth/logout`
- **Logout All Devices**: `POST /api/auth/logout-all` (requires auth)

## Response Structure

All auth endpoints return the same structure:

```json
{
  "status": "success",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // Access token (expires in 1 hour)
    "refreshToken": "prt_abc123def456...",               // Custom refresh token (expires in 30 days)
    "expiresIn": 3600,                                   // Seconds until access token expires
    "expiresAt": 1705324000                              // Unix timestamp when access token expires
  }
}
```

## Implementation Steps

### 1. Store Tokens After Login/Signup

```typescript
// After successful login/signup
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { data } = await response.json();

// Store tokens securely
localStorage.setItem('accessToken', data.token);
localStorage.setItem('refreshToken', data.refreshToken);

// Optionally store expiration time for proactive refresh
localStorage.setItem('tokenExpiresAt', data.expiresAt.toString());
```

### 2. Create API Client with Auto-Refresh

```typescript
// apiClient.ts
class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (value: string) => void; reject: (error: any) => void }> = [];
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token!);
      }
    });
    this.failedQueue = [];
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      this.clearAuth();
      return null;
    }

    // Check if refresh token looks valid (has our prefix)
    if (!refreshToken.startsWith('prt_')) {
      console.warn('Invalid refresh token format');
      this.clearAuth();
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        this.clearAuth();
        return null;
      }

      const { data } = await response.json();
      
      // IMPORTANT: Update both tokens - refresh token is rotated!
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('tokenExpiresAt', data.expiresAt.toString());
      
      return data.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuth();
      return null;
    }
  }

  private clearAuth() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    window.location.href = '/login';
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return true;
    
    // Add 60 second buffer to prevent edge cases
    return Date.now() / 1000 > parseInt(expiresAt) - 60;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let token = this.getAccessToken();

    // Proactively refresh if token is about to expire
    if (token && this.isTokenExpired()) {
      token = await this.refreshAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }
    }

    // Make initial request
    let response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // If token expired (401), try to refresh
    if (response.status === 401 && token) {
      // Handle concurrent requests during refresh
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          return fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${newToken}`,
              ...options.headers,
            },
          }).then(res => res.json());
        });
      }

      this.isRefreshing = true;
      const newToken = await this.refreshAccessToken();
      this.isRefreshing = false;
      
      if (newToken) {
        this.processQueue(null, newToken);
        // Retry original request with new token
        response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
        });
      } else {
        this.processQueue(new Error('Refresh failed'), null);
        throw new Error('Authentication required');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(process.env.REACT_APP_API_URL || 'http://localhost:3000');
```

### 3. React Hook Example (React/Next.js)

```typescript
// hooks/useApi.ts
import { useState, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRefreshing = useRef(false);
  const failedQueue = useRef<Array<{ resolve: (value: string) => void; reject: (error: any) => void }>>([]);

  const processQueue = (error: any, token: string | null = null) => {
    failedQueue.current.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token!);
      }
    });
    failedQueue.current = [];
  };

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    
    if (!refreshTokenValue || !refreshTokenValue.startsWith('prt_')) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (!response.ok) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        window.location.href = '/login';
        return null;
      }

      const { data } = await response.json();
      
      // IMPORTANT: Store the new rotated refresh token!
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('tokenExpiresAt', data.expiresAt.toString());
      
      return data.token;
    } catch (err) {
      console.error('Token refresh failed:', err);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      window.location.href = '/login';
      return null;
    }
  }, []);

  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      
      let response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      // Handle token expiration with queue for concurrent requests
      if (response.status === 401 && token) {
        if (isRefreshing.current) {
          return new Promise((resolve, reject) => {
            failedQueue.current.push({ resolve, reject });
          }).then(async (newToken) => {
            const retryResponse = await fetch(`${API_URL}${endpoint}`, {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newToken}`,
                ...options.headers,
              },
            });
            return retryResponse.json();
          });
        }

        isRefreshing.current = true;
        const newToken = await refreshToken();
        isRefreshing.current = false;
        
        if (newToken) {
          processQueue(null, newToken);
          response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${newToken}`,
              ...options.headers,
            },
          });
        } else {
          processQueue(new Error('Refresh failed'), null);
          throw new Error('Authentication required');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.message || 'Request failed');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  return { apiCall, loading, error };
};
```

### 4. Axios Interceptor Example

```typescript
// api/axios.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor - add token to requests
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken || !refreshToken.startsWith('prt_')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken, expiresAt } = response.data.data;
        
        // IMPORTANT: Update both tokens - refresh token is rotated!
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', newRefreshToken);
        localStorage.setItem('tokenExpiresAt', expiresAt.toString());

        processQueue(null, token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

### 5. Logout Implementation

```typescript
// Logout from current device
const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  try {
    // Revoke the refresh token on server
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    console.error('Logout request failed:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    window.location.href = '/login';
  }
};

// Logout from all devices (requires authentication)
const logoutAllDevices = async () => {
  const accessToken = localStorage.getItem('accessToken');
  
  try {
    await fetch(`${API_URL}/api/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error('Logout all request failed:', error);
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    window.location.href = '/login';
  }
};
```

## Important Considerations

### 1. Token Storage
- **localStorage**: Simple but accessible to XSS attacks
- **sessionStorage**: Cleared when tab closes
- **httpOnly Cookies**: Most secure (requires backend changes)
- **Memory**: Most secure but lost on refresh

### 2. Token Expiration
- **Access Token**: Expires after 1 hour
- **Custom Refresh Token**: Expires after 30 days
- **Token Rotation**: Each refresh token can only be used once
- Always use the new refresh token from the response!

### 3. Token Format
- Access tokens are standard Supabase JWTs
- Custom refresh tokens start with `prt_` prefix
- Never use old refresh tokens - they are revoked after use

### 4. Concurrent Requests
The implementations above handle concurrent requests by queuing them during refresh.

## Security Best Practices

1. **Never expose refresh tokens** in URLs or logs
2. **Use HTTPS** in production
3. **Implement CSRF protection** if using cookies
4. **Clear tokens on logout** and browser close (optional)
5. **Always use the new refresh token** - old ones are revoked
6. **Validate token format** before using (check `prt_` prefix)

## Testing

1. **Login** and verify tokens are stored (access token and `prt_*` refresh token)
2. **Make API calls** and verify Authorization header is included
3. **Wait for access token expiration** (1 hour) or manually clear it
4. **Verify automatic refresh** works and new tokens are stored
5. **Test with expired refresh token** (30 days) and verify redirect to login
6. **Test concurrent requests** during token refresh
7. **Test logout** and verify refresh token is revoked

## Database Setup

Before using the refresh token system, create the `refresh_tokens` table in your Supabase database:

```sql
-- Run the SQL from: sqlTable/refresh_tokens.sql
```

## Error Handling

Always handle these scenarios:
- ✅ Token refresh succeeds → Continue with request, update both tokens
- ✅ Token refresh fails → Clear tokens, redirect to login
- ✅ No refresh token available → Redirect to login
- ✅ Invalid refresh token format (no `prt_` prefix) → Redirect to login
- ✅ Network errors during refresh → Show error message, allow retry

## Support

For questions or issues, refer to:
- Backend API documentation: `http://localhost:3000/api-docs`
- Supabase Auth documentation: https://supabase.com/docs/guides/auth
