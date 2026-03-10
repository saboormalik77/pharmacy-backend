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
"[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OrdersPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/package.js [app-ssr] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-ssr] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-ssr] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/calendar.js [app-ssr] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/credit-card.js [app-ssr] (ecmascript) <export default as CreditCard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$funnel$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/funnel.js [app-ssr] (ecmascript) <export default as Filter>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$bag$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingBag$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/shopping-bag.js [app-ssr] (ecmascript) <export default as ShoppingBag>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/format.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/marketplaceService.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
const STATUS_OPTIONS = [
    {
        value: 'all',
        label: 'All Orders'
    },
    {
        value: 'pending',
        label: 'Pending'
    },
    {
        value: 'processing',
        label: 'Processing'
    },
    {
        value: 'paid',
        label: 'Paid'
    },
    {
        value: 'confirmed',
        label: 'Confirmed'
    },
    {
        value: 'shipped',
        label: 'Shipped'
    },
    {
        value: 'delivered',
        label: 'Delivered'
    },
    {
        value: 'cancelled',
        label: 'Cancelled'
    },
    {
        value: 'refunded',
        label: 'Refunded'
    }
];
function OrdersPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [pagination, setPagination] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [statusFilter, setStatusFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('all');
    const [currentPage, setCurrentPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadOrders();
    }, [
        statusFilter,
        currentPage
    ]);
    const loadOrders = async ()=>{
        try {
            setIsLoading(true);
            setError(null);
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["marketplaceService"].getOrders(currentPage, 10, statusFilter === 'all' ? undefined : statusFilter);
            setOrders(response.orders);
            setPagination(response.pagination);
        } catch (err) {
            setError(err.message || 'Failed to load orders');
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
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'delivered':
                return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
            case 'cancelled':
            case 'refunded':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };
    const formatDate = (dateString)=>{
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "container mx-auto px-4 py-8 max-w-5xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4 mb-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>router.push('/marketplace'),
                        className: "p-2 hover:bg-muted rounded-lg transition-colors",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                            lineNumber: 102,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 98,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-2xl font-bold",
                                children: "My Orders"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                lineNumber: 105,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-muted-foreground text-sm",
                                children: "View and track your marketplace orders"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                lineNumber: 106,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 104,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                lineNumber: 97,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col sm:flex-row gap-4 mb-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative flex-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$funnel$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__["Filter"], {
                            className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: statusFilter,
                            onChange: (e)=>{
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            },
                            className: "w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer",
                            children: STATUS_OPTIONS.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: option.value,
                                    children: option.label
                                }, option.value, false, {
                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                    lineNumber: 123,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                            lineNumber: 114,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                    lineNumber: 112,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                lineNumber: 111,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "h-5 w-5 text-destructive flex-shrink-0 mt-0.5"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 134,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "font-medium text-destructive",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                            lineNumber: 136,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 135,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                lineNumber: 133,
                columnNumber: 9
            }, this),
            isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "py-16 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "h-10 w-10 animate-spin text-teal-600 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 144,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground",
                        children: "Loading orders..."
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 145,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                lineNumber: 143,
                columnNumber: 9
            }, this) : orders.length === 0 ? /* Empty State */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "py-16 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$bag$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingBag$3e$__["ShoppingBag"], {
                        className: "h-16 w-16 text-muted-foreground/30 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 150,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-lg font-semibold mb-2",
                        children: "No orders found"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 151,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground mb-6",
                        children: statusFilter !== 'all' ? `You don't have any ${statusFilter} orders.` : "You haven't placed any orders yet."
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 152,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>router.push('/marketplace'),
                        className: "px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-all",
                        children: "Browse Marketplace"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 157,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                lineNumber: 149,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: orders.map((order)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                onClick: ()=>router.push(`/marketplace/orders/${order.id}`),
                                className: "bg-card rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-4 sm:p-6",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-start justify-between gap-4 flex-wrap",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-1 min-w-0",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-3 mb-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-mono font-bold text-lg",
                                                                children: order.orderNumber
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                lineNumber: 178,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`,
                                                                children: order.status
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                lineNumber: 179,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                        lineNumber: 177,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "flex items-center gap-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                                        className: "h-4 w-4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                        lineNumber: 185,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    order.itemCount,
                                                                    " ",
                                                                    order.itemCount === 1 ? 'item' : 'items'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                lineNumber: 184,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "flex items-center gap-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                                                        className: "h-4 w-4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                        lineNumber: 189,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    formatDate(order.createdAt)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                lineNumber: 188,
                                                                columnNumber: 25
                                                            }, this),
                                                            order.paymentMethodBrand && order.paymentMethodLast4 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "flex items-center gap-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__["CreditCard"], {
                                                                        className: "h-4 w-4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                        lineNumber: 194,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "capitalize",
                                                                        children: order.paymentMethodBrand
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                        lineNumber: 195,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    " ••••",
                                                                    order.paymentMethodLast4
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                lineNumber: 193,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                        lineNumber: 183,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                lineNumber: 176,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-right",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "font-bold text-lg",
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(order.totalAmount)
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                lineNumber: 202,
                                                                columnNumber: 25
                                                            }, this),
                                                            order.totalSavings > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-green-600 font-medium",
                                                                children: [
                                                                    "Saved ",
                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(order.totalSavings)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                                lineNumber: 204,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                        lineNumber: 201,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                                        className: "h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                        lineNumber: 209,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                                lineNumber: 200,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                    lineNumber: 174,
                                    columnNumber: 17
                                }, this)
                            }, order.id, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                lineNumber: 169,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 167,
                        columnNumber: 11
                    }, this),
                    pagination && pagination.totalPages > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-center gap-2 mt-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCurrentPage((p)=>Math.max(1, p - 1)),
                                disabled: currentPage === 1,
                                className: "px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all",
                                children: "Previous"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                lineNumber: 220,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "px-4 py-2 text-sm text-muted-foreground",
                                children: [
                                    "Page ",
                                    currentPage,
                                    " of ",
                                    pagination.totalPages
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                lineNumber: 227,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCurrentPage((p)=>Math.min(pagination.totalPages, p + 1)),
                                disabled: currentPage === pagination.totalPages,
                                className: "px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all",
                                children: "Next"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                                lineNumber: 230,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
                        lineNumber: 219,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true)
        ]
    }, void 0, true, {
        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/page.tsx",
        lineNumber: 95,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__5111a0a1._.js.map