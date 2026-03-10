(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Frontend/lib/utils/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/utils/cookies.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * Cookie utility functions for token and user data management
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/js-cookie/dist/js.cookie.mjs [app-client] (ecmascript)");
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
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
}
function getToken() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(TOKEN_COOKIE) || null;
}
function removeToken() {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove(TOKEN_COOKIE, {
        path: '/'
    });
}
function setRefreshToken(refreshToken) {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
}
function getRefreshToken() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(REFRESH_TOKEN_COOKIE) || null;
}
function removeRefreshToken() {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove(REFRESH_TOKEN_COOKIE, {
        path: '/'
    });
}
function setUserData(userData) {
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set(USER_COOKIE, JSON.stringify(userData), COOKIE_OPTIONS);
}
function getUserData() {
    const userData = __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(USER_COOKIE);
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
    __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove(USER_COOKIE, {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/authService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authService",
    ()=>authService
]);
/**
 * Authentication API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cookies.ts [app-client] (ecmascript)");
;
;
const authService = {
    /**
   * Sign up a new user
   */ async signup (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/signup', data, false);
        if (response.status === 'success' && response.data) {
            // Store token, refresh token, and user data in cookies
            if ("TURBOPACK compile-time truthy", 1) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(response.data.token);
                if (response.data.refreshToken) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setRefreshToken"])(response.data.refreshToken);
                }
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setUserData"])({
                    user: response.data.user,
                    pharmacyId: response.data.user.id
                });
            }
            return response.data;
        }
        throw new Error(response.message || 'Signup failed');
    },
    /**
   * Sign in an existing user
   */ async signin (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/signin', data, false);
        if (response.status === 'success' && response.data) {
            // Store token, refresh token, and user data in cookies
            if ("TURBOPACK compile-time truthy", 1) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(response.data.token);
                if (response.data.refreshToken) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setRefreshToken"])(response.data.refreshToken);
                }
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setUserData"])({
                    user: response.data.user,
                    pharmacyId: response.data.user.id
                });
            }
            return response.data;
        }
        throw new Error(response.message || 'Signin failed');
    },
    /**
   * Sign out current user
   */ signout () {
        if ("TURBOPACK compile-time truthy", 1) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
        }
    },
    /**
   * Get current user from cookies
   */ getCurrentUser () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        const userData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUserData"])();
        return userData?.user || null;
    },
    /**
   * Check if user is authenticated
   */ isAuthenticated () {
        return this.getCurrentUser() !== null;
    },
    /**
   * Request a password reset email
   */ async forgotPassword (email) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/forgot-password', {
            email,
            redirectTo: ("TURBOPACK compile-time truthy", 1) ? `${window.location.origin}/reset-password` : "TURBOPACK unreachable"
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/reset-password', {
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/verify-reset-token', {
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
        const refreshToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getRefreshToken"])();
        if (!refreshToken) {
            // No refresh token, user needs to login again
            if ("TURBOPACK compile-time truthy", 1) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                window.location.href = '/login';
            }
            return null;
        }
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/refresh', {
                refreshToken
            }, false);
            if (response.status === 'success' && response.data) {
                // Update stored tokens
                if ("TURBOPACK compile-time truthy", 1) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(response.data.token);
                    if (response.data.refreshToken) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setRefreshToken"])(response.data.refreshToken);
                    }
                }
                return response.data.token;
            }
            // Refresh token expired or invalid
            if ("TURBOPACK compile-time truthy", 1) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                window.location.href = '/login';
            }
            return null;
        } catch (error) {
            console.error('Token refresh failed:', error);
            if ("TURBOPACK compile-time truthy", 1) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                window.location.href = '/login';
            }
            return null;
        }
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "apiClient",
    ()=>apiClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * Base API Client
 * Handles authentication, error handling, and request/response formatting
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cookies.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$authService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/authService.ts [app-client] (ecmascript)");
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
            const newToken = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$authService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authService"].refreshAccessToken();
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
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getToken"])();
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
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        // Only check auth if auth is required and not on auth endpoints
        if (includeAuth && !endpoint.includes('/auth/')) {
            const token = this.getAuthToken();
            if (!token || this.isTokenExpired(token)) {
                // No token or token expired, redirect immediately without making request
                // Check if we're already on login page to avoid redirect loops
                const currentPath = window.location.pathname;
                if (currentPath !== '/login' && currentPath !== '/signup') {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                    window.location.href = '/login';
                }
                // Throw error to stop request execution
                throw {
                    status: 401,
                    message: 'Authentication required'
                };
            }
        }
    }
    /**
   * Get pharmacy ID from cookies
   */ getPharmacyIdFromCookies() {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPharmacyId"])();
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                        window.location.href = '/login';
                    }
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                        window.location.href = '/login';
                    }
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                        window.location.href = '/login';
                    }
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                        window.location.href = '/login';
                    }
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                        window.location.href = '/login';
                    }
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                        window.location.href = '/login';
                    }
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
                    if ("TURBOPACK compile-time truthy", 1) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthCookies"])();
                        window.location.href = '/login';
                    }
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/marketplaceService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "marketplaceService",
    ()=>marketplaceService
]);
/**
 * Marketplace API Service
 * Handles all pharmacy marketplace and cart operations
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const marketplaceService = {
    // ============================================================
    // Marketplace Deals
    // ============================================================
    /**
   * Get marketplace deals with pagination and filters
   * GET /api/marketplace
   */ async getDeals (filters) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace', filters);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch marketplace deals');
    },
    /**
   * Get marketplace deal by ID
   * GET /api/marketplace/:id
   */ async getDealById (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId(`/marketplace/${id}`);
        if (response.status === 'success' && response.data) {
            return response.data.deal;
        }
        throw new Error(response.message || 'Failed to fetch marketplace deal');
    },
    /**
   * Get marketplace categories
   * GET /api/marketplace/categories
   */ async getCategories () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/categories');
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/cart');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch cart');
    },
    /**
   * Get cart item count
   * GET /api/marketplace/cart/count
   */ async getCartCount () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/cart/count');
        if (response.status === 'success' && response.data) {
            return response.data.count;
        }
        throw new Error(response.message || 'Failed to fetch cart count');
    },
    /**
   * Add item to cart
   * POST /api/marketplace/cart
   */ async addToCart (dealId, quantity = 1) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/marketplace/cart', {
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch(`/marketplace/cart/${itemId}`, {
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete(`/marketplace/cart/${itemId}`);
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete('/marketplace/cart');
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/cart/validate');
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/marketplace/checkout', {
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
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/marketplace/orders', params);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch orders');
    },
    /**
   * Get order by ID
   * GET /api/marketplace/orders/:orderId
   */ async getOrderById (orderId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId(`/marketplace/orders/${orderId}`);
        if (response.status === 'success' && response.data) {
            return response.data.order;
        }
        throw new Error(response.message || 'Failed to fetch order');
    },
    /**
   * Get order by Stripe session ID
   * GET /api/marketplace/orders/session/:sessionId
   */ async getOrderBySessionId (sessionId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId(`/marketplace/orders/session/${sessionId}`);
        if (response.status === 'success' && response.data) {
            return response.data.order;
        }
        throw new Error(response.message || 'Failed to fetch order');
    },
    /**
   * Cancel order
   * POST /api/marketplace/orders/:orderId/cancel
   */ async cancelOrder (orderId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post(`/marketplace/orders/${orderId}/cancel`, {});
        if (response.status === 'success') {
            return {
                message: response.message || 'Order cancelled successfully',
                orderNumber: response.data?.orderNumber || ''
            };
        }
        throw new Error(response.message || 'Failed to cancel order');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OrderDetailPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$receipt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Receipt$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/receipt.js [app-client] (ecmascript) <export default as Receipt>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$truck$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Truck$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/truck.js [app-client] (ecmascript) <export default as Truck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/credit-card.js [app-client] (ecmascript) <export default as CreditCard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-client] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/marketplaceService.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function OrderDetailPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"])();
    const orderId = params.id;
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isCancelling, setIsCancelling] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [order, setOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OrderDetailPage.useEffect": ()=>{
            if (orderId) {
                loadOrder();
            }
        }
    }["OrderDetailPage.useEffect"], [
        orderId
    ]);
    const loadOrder = async ()=>{
        try {
            setIsLoading(true);
            setError(null);
            const orderData = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].getOrderById(orderId);
            setOrder(orderData);
        } catch (err) {
            setError(err.message || 'Failed to load order');
        } finally{
            setIsLoading(false);
        }
    };
    const handleCancelOrder = async ()=>{
        if (!order) return;
        if (!confirm('Are you sure you want to cancel this order?')) return;
        try {
            setIsCancelling(true);
            setError(null);
            await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].cancelOrder(orderId);
            // Reload order to get updated status
            await loadOrder();
        } catch (err) {
            setError(err.message || 'Failed to cancel order');
        } finally{
            setIsCancelling(false);
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
    const getStatusIcon = (status)=>{
        switch(status){
            case 'paid':
            case 'confirmed':
            case 'delivered':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                    className: "h-5 w-5"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 97,
                    columnNumber: 16
                }, this);
            case 'pending':
            case 'processing':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                    className: "h-5 w-5"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 100,
                    columnNumber: 16
                }, this);
            case 'shipped':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$truck$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Truck$3e$__["Truck"], {
                    className: "h-5 w-5"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 102,
                    columnNumber: 16
                }, this);
            case 'cancelled':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                    className: "h-5 w-5"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 104,
                    columnNumber: 16
                }, this);
            case 'refunded':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                    className: "h-5 w-5"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 106,
                    columnNumber: 16
                }, this);
            default:
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                    className: "h-5 w-5"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 108,
                    columnNumber: 16
                }, this);
        }
    };
    const formatDateTime = (dateString)=>{
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-[60vh] flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "h-10 w-10 animate-spin text-teal-600 mx-auto mb-4"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 128,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground",
                        children: "Loading order details..."
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 129,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                lineNumber: 127,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
            lineNumber: 126,
            columnNumber: 7
        }, this);
    }
    if (error && !order) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 py-16 max-w-2xl text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                    className: "h-16 w-16 text-destructive mx-auto mb-4"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 138,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-2xl font-bold mb-2",
                    children: "Error Loading Order"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 139,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-muted-foreground mb-6",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 140,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: ()=>router.push('/marketplace/orders'),
                    className: "px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-all",
                    children: "Back to Orders"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                    lineNumber: 141,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
            lineNumber: 137,
            columnNumber: 7
        }, this);
    }
    if (!order) return null;
    const canCancel = [
        'pending',
        'processing'
    ].includes(order.status);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "container mx-auto px-4 py-8 max-w-4xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4 mb-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>router.push('/marketplace/orders'),
                        className: "p-2 hover:bg-muted rounded-lg transition-colors",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                            lineNumber: 163,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 159,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-2xl font-bold",
                                children: [
                                    "Order ",
                                    order.orderNumber
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 166,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-muted-foreground text-sm",
                                children: [
                                    "Placed on ",
                                    formatDateTime(order.createdAt)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 167,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 165,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                lineNumber: 158,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "h-5 w-5 text-destructive flex-shrink-0 mt-0.5"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 176,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-destructive",
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 177,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                lineNumber: 175,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid lg:grid-cols-3 gap-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "lg:col-span-2 space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border shadow-sm p-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3 mb-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `p-2 rounded-full ${getStatusColor(order.status)}`,
                                                children: getStatusIcon(order.status)
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 187,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm text-muted-foreground",
                                                        children: "Order Status"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 191,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "font-bold text-lg capitalize",
                                                        children: order.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 192,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 190,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 186,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "border-t pt-4 mt-4",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3 text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: `w-2 h-2 rounded-full ${order.createdAt ? 'bg-green-500' : 'bg-gray-300'}`
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 200,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: order.createdAt ? 'text-foreground' : 'text-muted-foreground',
                                                            children: "Order Placed"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 201,
                                                            columnNumber: 19
                                                        }, this),
                                                        order.createdAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted-foreground ml-auto",
                                                            children: new Date(order.createdAt).toLocaleDateString()
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 205,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                    lineNumber: 199,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: `w-2 h-2 rounded-full ${order.paidAt ? 'bg-green-500' : 'bg-gray-300'}`
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 211,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: order.paidAt ? 'text-foreground' : 'text-muted-foreground',
                                                            children: "Payment Confirmed"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 212,
                                                            columnNumber: 19
                                                        }, this),
                                                        order.paidAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted-foreground ml-auto",
                                                            children: new Date(order.paidAt).toLocaleDateString()
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 216,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                    lineNumber: 210,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: `w-2 h-2 rounded-full ${order.shippedAt ? 'bg-green-500' : 'bg-gray-300'}`
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 222,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: order.shippedAt ? 'text-foreground' : 'text-muted-foreground',
                                                            children: "Shipped"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 223,
                                                            columnNumber: 19
                                                        }, this),
                                                        order.shippedAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted-foreground ml-auto",
                                                            children: new Date(order.shippedAt).toLocaleDateString()
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 227,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                    lineNumber: 221,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: `w-2 h-2 rounded-full ${order.deliveredAt ? 'bg-green-500' : 'bg-gray-300'}`
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 233,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: order.deliveredAt ? 'text-foreground' : 'text-muted-foreground',
                                                            children: "Delivered"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 234,
                                                            columnNumber: 19
                                                        }, this),
                                                        order.deliveredAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted-foreground ml-auto",
                                                            children: new Date(order.deliveredAt).toLocaleDateString()
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 238,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                    lineNumber: 232,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                            lineNumber: 198,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 197,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 185,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border shadow-sm overflow-hidden",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 border-b bg-muted/30",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "font-semibold flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                    className: "h-5 w-5"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                    lineNumber: 251,
                                                    columnNumber: 17
                                                }, this),
                                                "Order Items (",
                                                order.items?.length || 0,
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                            lineNumber: 250,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 249,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "divide-y",
                                        children: order.items?.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-4 flex gap-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                            className: "h-8 w-8 text-muted-foreground"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                            lineNumber: 259,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 258,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex-1 min-w-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                className: "font-semibold text-sm line-clamp-2",
                                                                children: item.productName
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                lineNumber: 262,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground",
                                                                children: [
                                                                    item.ndc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "font-mono",
                                                                        children: [
                                                                            "NDC: ",
                                                                            item.ndc
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                        lineNumber: 264,
                                                                        columnNumber: 36
                                                                    }, this),
                                                                    item.category && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            "• ",
                                                                            item.category
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                        lineNumber: 265,
                                                                        columnNumber: 41
                                                                    }, this),
                                                                    item.distributor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            "• ",
                                                                            item.distributor
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                        lineNumber: 266,
                                                                        columnNumber: 44
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                lineNumber: 263,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "mt-2 flex items-center gap-3 text-sm",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            "Qty: ",
                                                                            item.quantity
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                        lineNumber: 269,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-muted-foreground",
                                                                        children: "×"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                        lineNumber: 270,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(item.unitPrice)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                        lineNumber: 271,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                lineNumber: 268,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 261,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-right",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "font-bold",
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(item.lineTotal)
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                lineNumber: 275,
                                                                columnNumber: 21
                                                            }, this),
                                                            item.lineSavings > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-green-600 font-medium",
                                                                children: [
                                                                    "Saved ",
                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(item.lineSavings)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                                lineNumber: 277,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 274,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, item.id, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 257,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 255,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 248,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 183,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border shadow-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 border-b bg-muted/30",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "font-semibold",
                                            children: "Order Summary"
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                            lineNumber: 293,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 292,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 space-y-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-muted-foreground",
                                                        children: "Subtotal"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 297,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(order.subtotal)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 298,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 296,
                                                columnNumber: 15
                                            }, this),
                                            order.totalSavings > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm text-green-600",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Total Savings"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 302,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "−",
                                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(order.totalSavings)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 303,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 301,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-muted-foreground",
                                                        children: [
                                                            "Tax (",
                                                            (order.taxRate * 100).toFixed(0),
                                                            "%)"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 307,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(order.taxAmount)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 308,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 306,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-muted-foreground",
                                                        children: "Shipping"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 311,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-green-600",
                                                        children: "Free"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 312,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 310,
                                                columnNumber: 15
                                            }, this),
                                            order.discountAmount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between text-sm text-green-600",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Discount"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 316,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "−",
                                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(order.discountAmount)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 317,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 315,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "h-px bg-border my-2"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 320,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between font-bold text-lg",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Total"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 322,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(order.totalAmount)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                        lineNumber: 323,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 321,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 295,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 291,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border shadow-sm p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold flex items-center gap-2 mb-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__["CreditCard"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 331,
                                                columnNumber: 15
                                            }, this),
                                            "Payment"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 330,
                                        columnNumber: 13
                                    }, this),
                                    order.paymentMethodBrand && order.paymentMethodLast4 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "capitalize font-medium",
                                                children: order.paymentMethodBrand
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 336,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-muted-foreground",
                                                children: [
                                                    "•••• ",
                                                    order.paymentMethodLast4
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 337,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 335,
                                        columnNumber: 15
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-muted-foreground",
                                        children: order.status === 'pending' ? 'Awaiting payment' : 'Payment information not available'
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 340,
                                        columnNumber: 15
                                    }, this),
                                    order.stripeReceiptUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: order.stripeReceiptUrl,
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        className: "inline-flex items-center gap-1 text-sm text-teal-600 hover:underline mt-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$receipt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Receipt$3e$__["Receipt"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 351,
                                                columnNumber: 17
                                            }, this),
                                            "View Receipt"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 345,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 329,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border shadow-sm p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold flex items-center gap-2 mb-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$truck$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Truck$3e$__["Truck"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                lineNumber: 360,
                                                columnNumber: 15
                                            }, this),
                                            "Shipping"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 359,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm",
                                        children: "Free Standard Shipping"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 363,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-muted-foreground mt-1",
                                        children: "Estimated delivery: 3-5 business days"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 364,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 358,
                                columnNumber: 11
                            }, this),
                            canCancel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border shadow-sm p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold mb-3",
                                        children: "Actions"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 372,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleCancelOrder,
                                        disabled: isCancelling,
                                        className: "w-full px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                                        children: isCancelling ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                    className: "h-4 w-4 animate-spin"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                    lineNumber: 380,
                                                    columnNumber: 21
                                                }, this),
                                                "Cancelling..."
                                            ]
                                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                                    lineNumber: 385,
                                                    columnNumber: 21
                                                }, this),
                                                "Cancel Order"
                                            ]
                                        }, void 0, true)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 373,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 371,
                                columnNumber: 13
                            }, this),
                            order.notes && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-card rounded-xl border shadow-sm p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold mb-3",
                                        children: "Notes"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 396,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-muted-foreground",
                                        children: order.notes
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                        lineNumber: 397,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                                lineNumber: 395,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                        lineNumber: 289,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
                lineNumber: 181,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Frontend/app/(dashboard)/marketplace/orders/[id]/page.tsx",
        lineNumber: 156,
        columnNumber: 5
    }, this);
}
_s(OrderDetailPage, "TmCM1MYFuWWHjv4mypo4SnPH2qM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"]
    ];
});
_c = OrderDetailPage;
var _c;
__turbopack_context__.k.register(_c, "OrderDetailPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Frontend_edfe8e15._.js.map