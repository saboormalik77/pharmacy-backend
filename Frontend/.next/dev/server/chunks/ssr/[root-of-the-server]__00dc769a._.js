module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/Frontend/lib/utils/format.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Utility functions for formatting
__turbopack_context__.s([
    "formatCurrency",
    ()=>formatCurrency,
    "formatDate",
    ()=>formatDate,
    "formatDateTime",
    ()=>formatDateTime,
    "formatNDC",
    ()=>formatNDC
]);
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
function formatDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function formatNDC(ndc) {
    // Format NDC to standard 5-4-2 format
    const cleaned = ndc.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
    }
    return ndc;
}
}),
"[project]/Frontend/lib/utils/cookies.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearAuthCookies",
    ()=>clearAuthCookies,
    "getPharmacyId",
    ()=>getPharmacyId,
    "getRefreshToken",
    ()=>getRefreshToken,
    "getToken",
    ()=>getToken,
    "getUserData",
    ()=>getUserData,
    "removeRefreshToken",
    ()=>removeRefreshToken,
    "removeToken",
    ()=>removeToken,
    "removeUserData",
    ()=>removeUserData,
    "setRefreshToken",
    ()=>setRefreshToken,
    "setToken",
    ()=>setToken,
    "setUserData",
    ()=>setUserData
]);
/**
 * Cookie utility functions for token and user data management
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/js-cookie/dist/js.cookie.mjs [app-ssr] (ecmascript)");
;
const TOKEN_COOKIE = 'auth_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const USER_COOKIE = 'user_data';
const COOKIE_OPTIONS = {
    expires: 7,
    secure: ("TURBOPACK compile-time value", "development") === 'production',
    sameSite: 'lax',
    path: '/'
};
function setToken(token) {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
}
function getToken() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(TOKEN_COOKIE) || null;
}
function removeToken() {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].remove(TOKEN_COOKIE, {
        path: '/'
    });
}
function setRefreshToken(refreshToken) {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].set(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
}
function getRefreshToken() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(REFRESH_TOKEN_COOKIE) || null;
}
function removeRefreshToken() {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].remove(REFRESH_TOKEN_COOKIE, {
        path: '/'
    });
}
function setUserData(userData) {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].set(USER_COOKIE, JSON.stringify(userData), COOKIE_OPTIONS);
}
function getUserData() {
    const userData = __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(USER_COOKIE);
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch  {
            return null;
        }
    }
    return null;
}
function removeUserData() {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].remove(USER_COOKIE, {
        path: '/'
    });
}
function clearAuthCookies() {
    removeToken();
    removeRefreshToken();
    removeUserData();
}
function getPharmacyId() {
    const userData = getUserData();
    return userData?.user?.id || userData?.pharmacyId || null;
}
}),
"[project]/Frontend/lib/api/services/authService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authService",
    ()=>authService
]);
/**
 * Authentication API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cookies.ts [app-ssr] (ecmascript)");
;
;
const authService = {
    /**
   * Sign up a new user
   */ async signup (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/signup', data, false);
        if (response.status === 'success' && response.data) {
            // Store token, refresh token, and user data in cookies
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            return response.data;
        }
        throw new Error(response.message || 'Signup failed');
    },
    /**
   * Sign in an existing user
   */ async signin (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/signin', data, false);
        if (response.status === 'success' && response.data) {
            // Store token, refresh token, and user data in cookies
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            return response.data;
        }
        throw new Error(response.message || 'Signin failed');
    },
    /**
   * Sign out current user
   */ signout () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    },
    /**
   * Get current user from cookies
   */ getCurrentUser () {
        if ("TURBOPACK compile-time truthy", 1) return null;
        //TURBOPACK unreachable
        ;
        const userData = undefined;
    },
    /**
   * Check if user is authenticated
   */ isAuthenticated () {
        return this.getCurrentUser() !== null;
    },
    /**
   * Request a password reset email
   */ async forgotPassword (email) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/forgot-password', {
            email,
            redirectTo: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : undefined
        }, false);
        if (response.status === 'success') {
            return {
                message: response.message || 'Password reset email sent'
            };
        }
        throw new Error(response.message || 'Failed to send password reset email');
    },
    /**
   * Reset password using access token from email link
   */ async resetPassword (accessToken, newPassword) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/reset-password', {
            accessToken,
            newPassword
        }, false);
        if (response.status === 'success') {
            return {
                message: response.message || 'Password reset successfully'
            };
        }
        throw new Error(response.message || 'Failed to reset password');
    },
    /**
   * Verify if a reset token is valid
   */ async verifyResetToken (accessToken) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/verify-reset-token', {
            accessToken
        }, false);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        return {
            valid: false
        };
    },
    /**
   * Refresh access token using refresh token
   */ async refreshAccessToken () {
        const refreshToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getRefreshToken"])();
        if (!refreshToken) {
            // No refresh token, user needs to login again
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            return null;
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/refresh', {
                refreshToken
            }, false);
            if (response.status === 'success' && response.data) {
                // Update stored tokens
                if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                ;
                return response.data.token;
            }
            // Refresh token expired or invalid
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            return null;
        } catch (error) {
            console.error('Token refresh failed:', error);
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            return null;
        }
    }
};
}),
"[project]/Frontend/lib/api/client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "apiClient",
    ()=>apiClient
]);
/**
 * Base API Client
 * Handles authentication, error handling, and request/response formatting
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cookies.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$authService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/authService.ts [app-ssr] (ecmascript)");
;
;
const API_BASE_URL = ("TURBOPACK compile-time value", "http://localhost:3000/api") || 'https://pharmacy-backend-dusky.vercel.app/api';
class ApiClient {
    baseURL;
    isRefreshing = false;
    failedQueue = [];
    constructor(baseURL = API_BASE_URL){
        this.baseURL = baseURL;
    }
    /**
   * Process queued requests after token refresh
   */ processQueue(error, token = null) {
        this.failedQueue.forEach((prom)=>{
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
   */ async handleTokenRefresh(retryRequest) {
        // If already refreshing, queue this request
        if (this.isRefreshing) {
            return new Promise((resolve, reject)=>{
                this.failedQueue.push({
                    resolve: (value)=>resolve(value),
                    reject
                });
            }).then(()=>{
                return retryRequest();
            }).catch((error)=>{
                throw error;
            });
        }
        this.isRefreshing = true;
        try {
            const newToken = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$authService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authService"].refreshAccessToken();
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
        } finally{
            this.isRefreshing = false;
        }
    }
    /**
   * Get authentication token from cookies
   */ getAuthToken() {
        if ("TURBOPACK compile-time truthy", 1) return null;
        //TURBOPACK unreachable
        ;
    }
    /**
   * Check if JWT token is expired by decoding it
   * Note: This only checks expiration, doesn't verify signature
   */ isTokenExpired(token) {
        try {
            // JWT format: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) return true;
            // Decode payload (base64url)
            const payload = parts[1];
            // Replace URL-safe base64 characters
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            // Add padding if needed
            const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
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
   * Check if token exists and redirect to login if missing or expired
   * This prevents showing loading state when token is expired
   */ checkAuthBeforeRequest(includeAuth, endpoint) {
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }
    /**
   * Get pharmacy ID from cookies
   */ getPharmacyIdFromCookies() {
        if ("TURBOPACK compile-time truthy", 1) return null;
        //TURBOPACK unreachable
        ;
    }
    /**
   * Build headers for API requests
   */ getHeaders(includeAuth = true, customHeaders) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };
        if (includeAuth) {
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return headers;
    }
    /**
   * Handle API errors
   */ async handleError(response) {
        let errorMessage = 'An error occurred';
        let errorData = {};
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
                } catch  {
                    // If not JSON, use the text as error message
                    errorMessage = text || response.statusText || errorMessage;
                }
            }
        } catch (error) {
            // If all else fails, use status text
            errorMessage = response.statusText || errorMessage;
        }
        return {
            status: response.status,
            message: errorMessage,
            error: errorData.error
        };
    }
    /**
   * Make a GET request
   */ async get(endpoint, params, includeAuth = true) {
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
            Object.entries(params).forEach(([key, value])=>{
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.getHeaders(includeAuth)
            });
            if (!response.ok) {
                // Handle token expiration (401) - try to refresh token
                const isAuthEndpoint = endpoint.includes('/auth/');
                if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
                    // Try to refresh token and retry request
                    const retryResponse = await this.handleTokenRefresh(()=>this.get(endpoint, params, includeAuth));
                    if (retryResponse) {
                        return retryResponse;
                    }
                // If refresh failed, error will be thrown below
                }
                // Handle other errors or if refresh failed
                if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
                    // Clear auth cookies and redirect to login
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                }
                const error = await this.handleError(response);
                throw error;
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.status) {
                throw error;
            }
            throw {
                status: 500,
                message: error.message || 'Network error occurred'
            };
        }
    }
    async getApiWithoutPharmacyId(endpoint, params, includeAuth = true) {
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
            Object.entries(params).forEach(([key, value])=>{
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.getHeaders(includeAuth)
            });
            if (!response.ok) {
                // Handle token expiration (401) - try to refresh token
                const isAuthEndpoint = endpoint.includes('/auth/');
                if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
                    // Try to refresh token and retry request
                    const retryResponse = await this.handleTokenRefresh(()=>this.getApiWithoutPharmacyId(endpoint, params, includeAuth));
                    if (retryResponse) {
                        return retryResponse;
                    }
                // If refresh failed, error will be thrown below
                }
                // Handle other errors or if refresh failed
                if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
                    // Clear auth cookies and redirect to login
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                }
                const error = await this.handleError(response);
                throw error;
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.status) {
                throw error;
            }
            throw {
                status: 500,
                message: error.message || 'Network error occurred'
            };
        }
    }
    /**
   * Make a POST request
   */ async post(endpoint, body, includeAuth = true) {
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
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                // Handle token expiration (401) - try to refresh token
                const isAuthEndpoint = endpoint.includes('/auth/');
                if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
                    // Try to refresh token and retry request
                    const retryResponse = await this.handleTokenRefresh(()=>this.post(endpoint, body, includeAuth));
                    if (retryResponse) {
                        return retryResponse;
                    }
                // If refresh failed, error will be thrown below
                }
                // Handle other errors or if refresh failed
                if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
                    // Clear auth cookies and redirect to login
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                }
                const error = await this.handleError(response);
                throw error;
            }
            // Read response as text first, then try to parse as JSON
            const text = await response.text();
            if (!text || text.trim().length === 0) {
                return {
                    status: 'success'
                };
            }
            try {
                const data = JSON.parse(text);
                return data;
            } catch (parseError) {
                // If response is not valid JSON, it's likely an error
                throw {
                    status: 500,
                    message: `Server returned non-JSON response: ${text.substring(0, 200)}`
                };
            }
        } catch (error) {
            if (error.status) {
                throw error;
            }
            // Handle JSON parsing errors specifically
            if (error.message && error.message.includes('JSON')) {
                throw {
                    status: 500,
                    message: `Failed to parse server response: ${error.message}`
                };
            }
            throw {
                status: 500,
                message: error.message || 'Network error occurred'
            };
        }
    }
    /**
   * Make a PUT request
   */ async put(endpoint, body, includeAuth = true) {
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
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                // Handle token expiration (401) - try to refresh token
                const isAuthEndpoint = endpoint.includes('/auth/');
                if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
                    // Try to refresh token and retry request
                    const retryResponse = await this.handleTokenRefresh(()=>this.put(endpoint, body, includeAuth));
                    if (retryResponse) {
                        return retryResponse;
                    }
                // If refresh failed, error will be thrown below
                }
                // Handle other errors or if refresh failed
                if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
                    // Clear auth cookies and redirect to login
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                }
                const error = await this.handleError(response);
                throw error;
            }
            // Read response as text first, then try to parse as JSON
            const text = await response.text();
            if (!text || text.trim().length === 0) {
                return {
                    status: 'success'
                };
            }
            try {
                const data = JSON.parse(text);
                return data;
            } catch (parseError) {
                // If response is not valid JSON, it's likely an error
                throw {
                    status: 500,
                    message: `Server returned non-JSON response: ${text.substring(0, 200)}`
                };
            }
        } catch (error) {
            if (error.status) {
                throw error;
            }
            // Handle JSON parsing errors specifically
            if (error.message && error.message.includes('JSON')) {
                throw {
                    status: 500,
                    message: `Failed to parse server response: ${error.message}`
                };
            }
            throw {
                status: 500,
                message: error.message || 'Network error occurred'
            };
        }
    }
    /**
   * Make a PATCH request
   */ async patch(endpoint, body, includeAuth = true) {
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
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                // Handle token expiration (401) - try to refresh token
                const isAuthEndpoint = endpoint.includes('/auth/');
                if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
                    // Try to refresh token and retry request
                    const retryResponse = await this.handleTokenRefresh(()=>this.patch(endpoint, body, includeAuth));
                    if (retryResponse) {
                        return retryResponse;
                    }
                // If refresh failed, error will be thrown below
                }
                // Handle other errors or if refresh failed
                if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
                    // Clear auth cookies and redirect to login
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                }
                const error = await this.handleError(response);
                throw error;
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.status) {
                throw error;
            }
            throw {
                status: 500,
                message: error.message || 'Network error occurred'
            };
        }
    }
    /**
   * Make a DELETE request
   */ async delete(endpoint, includeAuth = true) {
        // Check token before making request - redirect immediately if missing
        this.checkAuthBeforeRequest(includeAuth, endpoint);
        const url = `${this.baseURL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders(includeAuth)
            });
            if (!response.ok) {
                // Handle token expiration (401) - try to refresh token
                const isAuthEndpoint = endpoint.includes('/auth/');
                if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
                    // Try to refresh token and retry request
                    const retryResponse = await this.handleTokenRefresh(()=>this.delete(endpoint, includeAuth));
                    if (retryResponse) {
                        return retryResponse;
                    }
                // If refresh failed, error will be thrown below
                }
                // Handle other errors or if refresh failed
                if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
                    // Clear auth cookies and redirect to login
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                }
                const error = await this.handleError(response);
                throw error;
            }
            // DELETE might return 204 No Content
            if (response.status === 204) {
                return {
                    status: 'success'
                };
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.status) {
                throw error;
            }
            throw {
                status: 500,
                message: error.message || 'Network error occurred'
            };
        }
    }
    /**
   * Upload a file (multipart/form-data)
   */ async upload(endpoint, formData, includeAuth = true) {
        // Check token before making request - redirect immediately if missing
        this.checkAuthBeforeRequest(includeAuth, endpoint);
        const url = `${this.baseURL}${endpoint}`;
        // Add pharmacy_id to formData if available
        const pharmacyId = this.getPharmacyIdFromCookies();
        if (pharmacyId && includeAuth) {
            formData.append('pharmacy_id', pharmacyId);
        }
        const headers = {};
        if (includeAuth) {
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        // Don't set Content-Type for FormData, browser will set it with boundary
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData
            });
            if (!response.ok) {
                // Handle token expiration (401) - try to refresh token
                const isAuthEndpoint = endpoint.includes('/auth/');
                if (response.status === 401 && !isAuthEndpoint && includeAuth && this.getAuthToken()) {
                    // Try to refresh token and retry request
                    const retryResponse = await this.handleTokenRefresh(()=>this.upload(endpoint, formData, includeAuth));
                    if (retryResponse) {
                        return retryResponse;
                    }
                // If refresh failed, error will be thrown below
                }
                // Handle other errors or if refresh failed
                if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
                    // Clear auth cookies and redirect to login
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                }
                const error = await this.handleError(response);
                throw error;
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.status) {
                throw error;
            }
            throw {
                status: 500,
                message: error.message || 'Network error occurred'
            };
        }
    }
}
const apiClient = new ApiClient();
}),
"[project]/Frontend/lib/api/services/marketplaceService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "marketplaceService",
    ()=>marketplaceService
]);
/**
 * Marketplace API Service
 * Handles all pharmacy marketplace and cart operations
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-ssr] (ecmascript)");
;
const marketplaceService = {
    // ============================================================
    // Marketplace Deals
    // ============================================================
    /**
   * Get marketplace deals with pagination and filters
   * GET /api/marketplace
   */ async getDeals (filters) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace', filters);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch marketplace deals');
    },
    /**
   * Get marketplace deal by ID
   * GET /api/marketplace/:id
   */ async getDealById (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId(`/marketplace/${id}`);
        if (response.status === 'success' && response.data) {
            return response.data.deal;
        }
        throw new Error(response.message || 'Failed to fetch marketplace deal');
    },
    /**
   * Get marketplace categories
   * GET /api/marketplace/categories
   */ async getCategories () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/categories');
        if (response.status === 'success' && response.data) {
            return response.data.categories;
        }
        throw new Error(response.message || 'Failed to fetch marketplace categories');
    },
    // ============================================================
    // Cart Operations
    // ============================================================
    /**
   * Get pharmacy cart
   * GET /api/marketplace/cart
   */ async getCart () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/cart');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch cart');
    },
    /**
   * Get cart item count
   * GET /api/marketplace/cart/count
   */ async getCartCount () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/cart/count');
        if (response.status === 'success' && response.data) {
            return response.data.count;
        }
        throw new Error(response.message || 'Failed to fetch cart count');
    },
    /**
   * Add item to cart
   * POST /api/marketplace/cart
   */ async addToCart (dealId, quantity = 1) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/marketplace/cart', {
            dealId,
            quantity
        });
        if (response.status === 'success') {
            return {
                message: response.message || 'Item added to cart',
                item: response.data?.item || {}
            };
        }
        throw new Error(response.message || 'Failed to add item to cart');
    },
    /**
   * Update cart item quantity
   * PATCH /api/marketplace/cart/:itemId
   */ async updateCartItem (itemId, quantity) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].patch(`/marketplace/cart/${itemId}`, {
            quantity
        });
        if (response.status === 'success') {
            return {
                message: response.message || 'Cart updated successfully',
                newQuantity: response.data?.newQuantity || quantity
            };
        }
        throw new Error(response.message || 'Failed to update cart item');
    },
    /**
   * Remove item from cart
   * DELETE /api/marketplace/cart/:itemId
   */ async removeFromCart (itemId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].delete(`/marketplace/cart/${itemId}`);
        if (response.status === 'success') {
            return {
                message: response.message || 'Item removed from cart'
            };
        }
        throw new Error(response.message || 'Failed to remove item from cart');
    },
    /**
   * Clear entire cart
   * DELETE /api/marketplace/cart
   */ async clearCart () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].delete('/marketplace/cart');
        if (response.status === 'success') {
            return {
                message: response.message || 'Cart cleared successfully',
                itemsRemoved: response.data?.itemsRemoved || 0
            };
        }
        throw new Error(response.message || 'Failed to clear cart');
    },
    /**
   * Validate cart before checkout
   * GET /api/marketplace/cart/validate
   */ async validateCart () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/cart/validate');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to validate cart');
    },
    // ============================================================
    // Checkout & Orders
    // ============================================================
    /**
   * Create Stripe checkout session
   * POST /api/marketplace/checkout
   */ async createCheckoutSession (email, pharmacyName) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post('/marketplace/checkout', {
            email,
            pharmacyName
        });
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to create checkout session');
    },
    /**
   * Get pharmacy orders list
   * GET /api/marketplace/orders
   */ async getOrders (page = 1, limit = 10, status) {
        const params = {
            page,
            limit
        };
        if (status && status !== 'all') {
            params.status = status;
        }
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/orders', params);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch orders');
    },
    /**
   * Get order by ID
   * GET /api/marketplace/orders/:orderId
   */ async getOrderById (orderId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId(`/marketplace/orders/${orderId}`);
        if (response.status === 'success' && response.data) {
            return response.data.order;
        }
        throw new Error(response.message || 'Failed to fetch order');
    },
    /**
   * Get order by Stripe session ID
   * GET /api/marketplace/orders/session/:sessionId
   */ async getOrderBySessionId (sessionId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId(`/marketplace/orders/session/${sessionId}`);
        if (response.status === 'success' && response.data) {
            return response.data.order;
        }
        throw new Error(response.message || 'Failed to fetch order');
    },
    /**
   * Cancel order
   * POST /api/marketplace/orders/:orderId/cancel
   */ async cancelOrder (orderId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiClient"].post(`/marketplace/orders/${orderId}/cancel`, {});
        if (response.status === 'success') {
            return {
                message: response.message || 'Order cancelled successfully',
                orderNumber: response.data?.orderNumber || ''
            };
        }
        throw new Error(response.message || 'Failed to cancel order');
    }
};
}),
"[project]/Frontend/lib/store/marketplaceStore.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMarketplaceStore",
    ()=>useMarketplaceStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/marketplaceService.ts [app-ssr] (ecmascript)");
;
;
const useMarketplaceStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        // Initial state - Deals
        deals: [],
        featuredDeal: null,
        stats: null,
        pagination: null,
        categories: [],
        filters: {
            page: 1,
            limit: 12,
            sortBy: 'posted_date',
            sortOrder: 'desc'
        },
        isLoadingDeals: false,
        dealsError: null,
        // Initial state - Cart
        cartItems: [],
        cartSummary: null,
        isCartOpen: false,
        isCartLoading: false,
        cartError: null,
        // Initial state - Modal
        isDealModalOpen: false,
        selectedDeal: null,
        // ============================================================
        // Deals Actions
        // ============================================================
        fetchDeals: async (filters)=>{
            set({
                isLoadingDeals: true,
                dealsError: null
            });
            try {
                const mergedFilters = {
                    ...get().filters,
                    ...filters
                };
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getDeals(mergedFilters);
                // Set the first active deal as the featured deal
                const activeDeals = response.deals.filter((deal)=>deal.status === 'active');
                const featuredDeal = activeDeals.length > 0 ? activeDeals[0] : null;
                const remainingDeals = featuredDeal ? response.deals.filter((deal)=>deal.id !== featuredDeal.id) : response.deals;
                set({
                    deals: remainingDeals,
                    featuredDeal,
                    stats: response.stats,
                    pagination: response.pagination,
                    filters: mergedFilters,
                    isLoadingDeals: false
                });
            } catch (error) {
                set({
                    isLoadingDeals: false,
                    dealsError: error.message || 'Failed to fetch deals'
                });
            }
        },
        fetchDealById: async (id)=>{
            try {
                const deal = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getDealById(id);
                return deal;
            } catch (error) {
                console.error('Failed to fetch deal:', error);
                return null;
            }
        },
        fetchCategories: async ()=>{
            try {
                const categories = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getCategories();
                set({
                    categories
                });
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        },
        setFilters: (filters)=>{
            set({
                filters: {
                    ...get().filters,
                    ...filters
                }
            });
        },
        // ============================================================
        // Cart Actions (API Integrated)
        // ============================================================
        fetchCart: async ()=>{
            set({
                isCartLoading: true,
                cartError: null
            });
            try {
                const cart = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getCart();
                set({
                    cartItems: cart.items,
                    cartSummary: cart.summary,
                    isCartLoading: false
                });
            } catch (error) {
                set({
                    isCartLoading: false,
                    cartError: error.message || 'Failed to fetch cart'
                });
            }
        },
        fetchCartCount: async ()=>{
            try {
                const count = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getCartCount();
                return count;
            } catch (error) {
                console.error('Failed to fetch cart count:', error);
                return 0;
            }
        },
        addToCart: async (dealId, quantity = 1)=>{
            set({
                isCartLoading: true,
                cartError: null
            });
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].addToCart(dealId, quantity);
                // Refresh cart after adding
                await get().fetchCart();
                // Also refresh deals to update inCart status
                await get().fetchDeals();
                return true;
            } catch (error) {
                set({
                    isCartLoading: false,
                    cartError: error.message || 'Failed to add to cart'
                });
                return false;
            }
        },
        updateCartItemQuantity: async (itemId, quantity)=>{
            set({
                isCartLoading: true,
                cartError: null
            });
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].updateCartItem(itemId, quantity);
                // Refresh cart after updating
                await get().fetchCart();
                return true;
            } catch (error) {
                set({
                    isCartLoading: false,
                    cartError: error.message || 'Failed to update cart item'
                });
                return false;
            }
        },
        removeFromCart: async (itemId)=>{
            set({
                isCartLoading: true,
                cartError: null
            });
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].removeFromCart(itemId);
                // Refresh cart after removing
                await get().fetchCart();
                // Also refresh deals to update inCart status
                await get().fetchDeals();
                return true;
            } catch (error) {
                set({
                    isCartLoading: false,
                    cartError: error.message || 'Failed to remove from cart'
                });
                return false;
            }
        },
        clearCart: async ()=>{
            set({
                isCartLoading: true,
                cartError: null
            });
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].clearCart();
                set({
                    cartItems: [],
                    cartSummary: null,
                    isCartLoading: false
                });
                // Refresh deals to update inCart status
                await get().fetchDeals();
                return true;
            } catch (error) {
                set({
                    isCartLoading: false,
                    cartError: error.message || 'Failed to clear cart'
                });
                return false;
            }
        },
        // ============================================================
        // Cart UI Actions
        // ============================================================
        toggleCart: ()=>{
            const newState = !get().isCartOpen;
            set({
                isCartOpen: newState
            });
            // Fetch cart when opening
            if (newState) {
                get().fetchCart();
            }
        },
        openCart: ()=>{
            set({
                isCartOpen: true
            });
            get().fetchCart();
        },
        closeCart: ()=>{
            set({
                isCartOpen: false
            });
        },
        // ============================================================
        // Modal Actions
        // ============================================================
        openDealModal: (deal)=>{
            set({
                selectedDeal: deal,
                isDealModalOpen: true
            });
        },
        closeDealModal: ()=>{
            set({
                isDealModalOpen: false,
                selectedDeal: null
            });
        },
        // ============================================================
        // Computed Values
        // ============================================================
        getCartTotal: ()=>{
            const summary = get().cartSummary;
            if (summary) {
                return summary.total;
            }
            // Fallback calculation from items
            const subtotal = get().getCartSubtotal();
            const tax = subtotal * 0.08;
            return subtotal + tax;
        },
        getCartSubtotal: ()=>{
            const summary = get().cartSummary;
            if (summary) {
                return summary.subtotal;
            }
            // Fallback calculation from items
            return get().cartItems.reduce((sum, item)=>sum + item.totalPrice, 0);
        },
        getTotalSavings: ()=>{
            const summary = get().cartSummary;
            if (summary) {
                return summary.totalSavings;
            }
            // Fallback calculation from items
            return get().cartItems.reduce((sum, item)=>sum + item.savings, 0);
        },
        getItemCount: ()=>{
            const summary = get().cartSummary;
            if (summary) {
                return summary.itemCount;
            }
            // Fallback calculation from items
            return get().cartItems.length;
        }
    }));
}),
"[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CheckoutSuccessPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-ssr] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/package.js [app-ssr] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-ssr] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$receipt$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Receipt$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/receipt.js [app-ssr] (ecmascript) <export default as Receipt>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$truck$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Truck$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/truck.js [app-ssr] (ecmascript) <export default as Truck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/calendar.js [app-ssr] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/credit-card.js [app-ssr] (ecmascript) <export default as CreditCard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/format.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/marketplaceService.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/store/marketplaceStore.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cookies.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
function CheckoutSuccessPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const sessionId = searchParams.get('session_id');
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [order, setOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isAuthenticated, setIsAuthenticated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const { fetchCart } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMarketplaceStore"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Check authentication client-side
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getToken"])();
        if (!token) {
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
        }
        if (sessionId) {
            loadOrder();
        } else {
            setError('No session ID provided');
            setIsLoading(false);
        }
    }, [
        sessionId
    ]);
    const loadOrder = async ()=>{
        try {
            setIsLoading(true);
            setError(null);
            // Get order by session ID
            const orderData = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getOrderBySessionId(sessionId);
            setOrder(orderData);
            // Refresh cart (should be empty now)
            await fetchCart();
        } catch (err) {
            // If order not found yet, it might still be processing
            if (err.message?.includes('not found')) {
                // Poll for a few seconds
                setTimeout(async ()=>{
                    try {
                        const orderData = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getOrderBySessionId(sessionId);
                        setOrder(orderData);
                        await fetchCart();
                    } catch (retryErr) {
                        setError('Order is being processed. Please check your orders page in a few moments.');
                    }
                }, 2000);
            } else {
                setError(err.message || 'Failed to load order');
            }
        } finally{
            setIsLoading(false);
        }
    };
    const getStatusColor = (status)=>{
        switch(status){
            case 'paid':
            case 'confirmed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'pending':
            case 'processing':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            case 'shipped':
            case 'delivered':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-[60vh] flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "h-10 w-10 animate-spin text-teal-600 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 102,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground",
                        children: "Processing your order..."
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 103,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                lineNumber: 101,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
            lineNumber: 100,
            columnNumber: 7
        }, this);
    }
    // Handle unauthenticated state after Stripe redirect
    if (!isAuthenticated) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 py-16 max-w-2xl text-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-card rounded-2xl border shadow-sm p-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                        className: "h-16 w-16 text-green-500 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 114,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold mb-2",
                        children: "Payment Successful!"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 115,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground mb-6",
                        children: "Your payment was processed successfully. Please log in to view your order details."
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 116,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col sm:flex-row gap-4 justify-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>router.push(`/login?redirect=/marketplace/orders`),
                            className: "px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-all",
                            children: "Log In to View Order"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                            lineNumber: 120,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 119,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                lineNumber: 113,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
            lineNumber: 112,
            columnNumber: 7
        }, this);
    }
    if (error && !order) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 py-16 max-w-2xl text-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-card rounded-2xl border shadow-sm p-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "h-16 w-16 text-amber-500 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 136,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold mb-2",
                        children: "Order Processing"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 137,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground mb-6",
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 138,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col sm:flex-row gap-4 justify-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>router.push('/marketplace/orders'),
                                className: "px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-all",
                                children: "View My Orders"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 140,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>router.push('/marketplace'),
                                className: "px-6 py-3 border rounded-lg hover:bg-muted font-medium transition-all",
                                children: "Continue Shopping"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 146,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 139,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                lineNumber: 135,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
            lineNumber: 134,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "container mx-auto px-4 py-8 max-w-3xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center mb-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                            className: "h-10 w-10 text-green-600"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                            lineNumber: 163,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 162,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-3xl font-bold mb-2",
                        children: "Order Confirmed!"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 165,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground",
                        children: "Thank you for your purchase. Your order has been received."
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 166,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                lineNumber: 161,
                columnNumber: 7
            }, this),
            order && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-card rounded-2xl border shadow-sm overflow-hidden mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-6 border-b bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between flex-wrap gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-muted-foreground",
                                                    children: "Order Number"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                    lineNumber: 178,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xl font-bold font-mono",
                                                    children: order.orderNumber
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                    lineNumber: 179,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                            lineNumber: 177,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `px-4 py-1.5 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`,
                                            children: order.status
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                            lineNumber: 181,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                    lineNumber: 176,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 175,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold mb-4 flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 190,
                                                columnNumber: 17
                                            }, this),
                                            "Items Ordered"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 189,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-3 mb-6",
                                        children: order.items?.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "font-medium text-sm",
                                                                children: item.productName
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                                lineNumber: 197,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-muted-foreground",
                                                                children: [
                                                                    item.ndc && `NDC: ${item.ndc} • `,
                                                                    "Qty: ",
                                                                    item.quantity,
                                                                    " × ",
                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(item.unitPrice)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                                lineNumber: 198,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 196,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-right",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "font-semibold",
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(item.lineTotal)
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                                lineNumber: 203,
                                                                columnNumber: 23
                                                            }, this),
                                                            item.lineSavings > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-green-600",
                                                                children: [
                                                                    "Saved ",
                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(item.lineSavings)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                                lineNumber: 205,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 202,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, item.id, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 195,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 193,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "border-t pt-4 space-y-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-muted-foreground",
                                                        children: "Subtotal"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 215,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(order.subtotal)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 216,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 214,
                                                columnNumber: 17
                                            }, this),
                                            order.totalSavings > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm text-green-600",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Total Savings"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 220,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "−",
                                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(order.totalSavings)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 221,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 219,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-muted-foreground",
                                                        children: [
                                                            "Tax (",
                                                            (order.taxRate * 100).toFixed(0),
                                                            "%)"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 225,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(order.taxAmount)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 226,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 224,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-muted-foreground",
                                                        children: "Shipping"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 229,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-green-600",
                                                        children: "Free"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 230,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 228,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between font-bold text-lg pt-2 border-t mt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Total"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 233,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(order.totalAmount)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                        lineNumber: 234,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 232,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 213,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 187,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 174,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid sm:grid-cols-2 gap-4 mb-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold flex items-center gap-2 mb-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__["CreditCard"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 245,
                                                columnNumber: 17
                                            }, this),
                                            "Payment"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 244,
                                        columnNumber: 15
                                    }, this),
                                    order.paymentMethodBrand && order.paymentMethodLast4 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "capitalize",
                                                children: order.paymentMethodBrand
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 250,
                                                columnNumber: 19
                                            }, this),
                                            " ending in ",
                                            order.paymentMethodLast4
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 249,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-muted-foreground",
                                        children: "Processing..."
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 253,
                                        columnNumber: 17
                                    }, this),
                                    order.stripeReceiptUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: order.stripeReceiptUrl,
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        className: "inline-flex items-center gap-1 text-sm text-teal-600 hover:underline mt-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$receipt$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Receipt$3e$__["Receipt"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 262,
                                                columnNumber: 19
                                            }, this),
                                            "View Receipt"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 256,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 243,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold flex items-center gap-2 mb-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$truck$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Truck$3e$__["Truck"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                                lineNumber: 271,
                                                columnNumber: 17
                                            }, this),
                                            "Shipping"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 270,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm",
                                        children: "Free Standard Shipping"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 274,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-muted-foreground mt-1",
                                        children: "Estimated delivery: 3-5 business days"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                        lineNumber: 275,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 269,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 241,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center text-sm text-muted-foreground mb-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                className: "h-4 w-4 inline mr-1"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 283,
                                columnNumber: 13
                            }, this),
                            "Order placed on ",
                            new Date(order.createdAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 282,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col sm:flex-row gap-4 justify-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>router.push('/marketplace/orders'),
                        className: "px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-all flex items-center justify-center gap-2",
                        children: [
                            "View All Orders",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                                lineNumber: 303,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 298,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>router.push('/marketplace'),
                        className: "px-6 py-3 border rounded-lg hover:bg-muted font-medium transition-all",
                        children: "Continue Shopping"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                        lineNumber: 305,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
                lineNumber: 297,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Frontend/app/(dashboard)/marketplace/checkout/success/page.tsx",
        lineNumber: 159,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__00dc769a._.js.map