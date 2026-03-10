# Frontend Refresh Token Implementation Guide

## Overview

This guide explains how to implement the refresh token mechanism on the frontend to handle automatic token refresh when access tokens expire.

## API Endpoints

- **Login**: `POST /api/auth/signin`
- **Signup**: `POST /api/auth/signup`
- **Refresh Token**: `POST /api/auth/refresh`

## Response Structure

All auth endpoints return the same structure:

```json
{
  "status": "success",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // Access token (expires in ~1 hour)
    "refreshToken": "v1.abc123def456...",                // Refresh token (expires in ~7 days)
    "session": { ... }
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
```

### 2. Create API Client with Auto-Refresh

```typescript
// apiClient.ts
class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      // No refresh token, user needs to login again
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
        // Refresh token expired or invalid
        this.clearAuth();
        return null;
      }

      const { data } = await response.json();
      
      // Update stored tokens
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      
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
    // Redirect to login page
    window.location.href = '/login';
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let token = this.getAccessToken();

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
      const newToken = await this.refreshAccessToken();
      
      if (newToken) {
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
        // Refresh failed, user needs to login
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
import { useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    
    if (!refreshTokenValue) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (!response.ok) {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return null;
      }

      const { data } = await response.json();
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      return data.token;
    } catch (err) {
      console.error('Token refresh failed:', err);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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

      // Handle token expiration
      if (response.status === 401 && token) {
        const newToken = await refreshToken();
        
        if (newToken) {
          // Retry with new token
          response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${newToken}`,
              ...options.headers,
            },
          });
        } else {
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
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Refresh the token
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken } = response.data.data;
        
        // Update stored tokens
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update the authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

### 5. Usage Examples

#### Using the API Client

```typescript
// Example: Fetch recommendations
import { apiClient } from './apiClient';

const fetchRecommendations = async () => {
  try {
    const data = await apiClient.get('/api/optimization/recommendations');
    return data;
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    throw error;
  }
};
```

#### Using React Hook

```typescript
// Component example
import { useApi } from './hooks/useApi';

const RecommendationsComponent = () => {
  const { apiCall, loading, error } = useApi();
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiCall('/api/optimization/recommendations');
        setRecommendations(response.data);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    fetchData();
  }, [apiCall]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{/* Render recommendations */}</div>;
};
```

#### Using Axios

```typescript
// Example: Fetch recommendations
import axiosInstance from './api/axios';

const fetchRecommendations = async () => {
  try {
    const response = await axiosInstance.get('/api/optimization/recommendations');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    throw error;
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
- **Access Token**: Expires after ~1 hour
- **Refresh Token**: Expires after ~7 days
- Always check for 401 responses and refresh automatically

### 3. Concurrent Requests
If multiple requests fail with 401 simultaneously, implement a queue to prevent multiple refresh attempts:

```typescript
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

// In your interceptor/handler:
if (error.response?.status === 401 && !isRefreshing) {
  isRefreshing = true;
  
  return refreshToken()
    .then(token => {
      processQueue(null, token);
      // Retry original request
    })
    .catch(err => {
      processQueue(err, null);
      return Promise.reject(err);
    })
    .finally(() => {
      isRefreshing = false;
    });
} else if (isRefreshing) {
  // Queue the request
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then(token => {
    // Retry original request with new token
  });
}
```

### 4. Logout

```typescript
const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Optionally call logout endpoint
  window.location.href = '/login';
};
```

## Testing

1. **Login** and verify tokens are stored
2. **Make API calls** and verify Authorization header is included
3. **Wait for token expiration** (or manually expire it) and verify automatic refresh
4. **Test with expired refresh token** and verify redirect to login
5. **Test concurrent requests** during token refresh

## Error Handling

Always handle these scenarios:
- ✅ Token refresh succeeds → Continue with request
- ✅ Token refresh fails → Clear tokens, redirect to login
- ✅ No refresh token available → Redirect to login
- ✅ Network errors during refresh → Show error message, allow retry

## Security Best Practices

1. **Never expose refresh tokens** in URLs or logs
2. **Use HTTPS** in production
3. **Implement CSRF protection** if using cookies
4. **Clear tokens on logout** and browser close (optional)
5. **Validate token expiration** before making requests (optional optimization)

## Support

For questions or issues, refer to:
- Backend API documentation: `http://localhost:3000/api-docs`
- Supabase Auth documentation: https://supabase.com/docs/guides/auth

