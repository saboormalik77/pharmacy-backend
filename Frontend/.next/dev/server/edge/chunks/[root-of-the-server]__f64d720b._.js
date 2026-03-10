(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f64d720b._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/Frontend/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
// Protected routes that require authentication
const protectedRoutes = [
    '/dashboard',
    '/products',
    '/upload',
    '/optimization',
    '/packages',
    '/top-distributors',
    '/analytics',
    '/reports',
    '/documents',
    '/notifications',
    '/settings',
    '/subscription',
    '/support',
    '/credits',
    '/payments',
    '/orders',
    '/returns',
    '/shipments',
    '/inventory',
    '/marketplace',
    '/barcode-generator',
    '/warehouse'
];
// Routes that are publicly accessible (for external redirects like Stripe)
// These routes handle their own authentication client-side
const externalRedirectRoutes = [
    '/marketplace/checkout/success',
    '/subscription'
];
// Public routes that don't require authentication
const publicRoutes = [
    '/login',
    '/register',
    '/'
];
function middleware(request) {
    const { pathname } = request.nextUrl;
    // Check if the current path is an external redirect route (Stripe, etc.)
    // These routes handle auth client-side to avoid issues with cross-origin cookies
    const isExternalRedirectRoute = externalRedirectRoutes.some((route)=>pathname.startsWith(route));
    // Allow external redirect routes to pass through (they handle auth client-side)
    if (isExternalRedirectRoute) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Check if the current path is a protected route
    const isProtectedRoute = protectedRoutes.some((route)=>pathname.startsWith(route));
    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some((route)=>pathname === route);
    // Get the auth token from cookies
    const token = request.cookies.get('auth_token')?.value;
    // If accessing a protected route without a token, redirect to login
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        // Preserve the intended destination for redirect after login
        loginUrl.searchParams.set('redirect', pathname);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
    }
    // If accessing login/register with a token, redirect to dashboard
    if ((pathname === '/login' || pathname === '/register') && token) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/dashboard', request.url));
    }
    // Allow the request to proceed
    return __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */ '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f64d720b._.js.map