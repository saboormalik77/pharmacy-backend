(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Frontend/lib/utils/cn.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/components/layout/Sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cn.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/credit-card.js [app-client] (ecmascript) <export default as CreditCard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scan$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ScanLine$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/scan-line.js [app-client] (ecmascript) <export default as ScanLine>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/building-2.js [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/shopping-cart.js [app-client] (ecmascript) <export default as ShoppingCart>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
const navItems = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"]
    },
    {
        title: 'Upload Documents',
        href: '/upload',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"]
    },
    {
        title: 'My Products',
        href: '/products',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scan$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ScanLine$3e$__["ScanLine"]
    },
    // {
    //   title: 'Analytics & Reports',
    //   href: '/reports',
    //   icon: BarChart3,
    // },
    {
        title: 'Search',
        href: '/optimization',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"]
    },
    {
        title: 'Packages',
        href: '/packages',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"]
    },
    {
        title: 'Marketplace',
        href: '/marketplace',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"]
    },
    {
        title: 'Top Distributors',
        href: '/top-distributors',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"]
    }
];
function Sidebar({ onClose }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-full w-64 flex-col border-r bg-card",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 sm:p-6 flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xl sm:text-2xl font-bold text-teal-600",
                                children: "PharmAnalytics"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                                lineNumber: 94,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs sm:text-sm text-muted-foreground",
                                children: "Data Analytics Platform"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                                lineNumber: 95,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        className: "lg:hidden p-2 hover:bg-accent rounded-md",
                        "aria-label": "Close menu",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                            lineNumber: 102,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                lineNumber: 92,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "flex-1 space-y-1 px-3",
                children: navItems.map((item)=>{
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: item.href,
                        onClick: onClose,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-teal-600 text-white' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                className: "h-5 w-5 flex-shrink-0"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                                lineNumber: 123,
                                columnNumber: 15
                            }, this),
                            item.title
                        ]
                    }, item.href, true, {
                        fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                        lineNumber: 112,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                lineNumber: 106,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-t p-3 space-y-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/settings",
                        className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                                lineNumber: 135,
                                columnNumber: 11
                            }, this),
                            "Settings"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                        lineNumber: 131,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/subscription",
                        className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__["CreditCard"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                                lineNumber: 142,
                                columnNumber: 11
                            }, this),
                            "Subscription"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                        lineNumber: 138,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
                lineNumber: 130,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Frontend/components/layout/Sidebar.tsx",
        lineNumber: 91,
        columnNumber: 5
    }, this);
}
_s(Sidebar, "xbyQPtUVMO7MNj7WjJlpdWqRcTo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
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
"[project]/Frontend/lib/api/services/inventoryService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "inventoryService",
    ()=>inventoryService
]);
/**
 * Inventory API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const inventoryService = {
    /**
   * Get all inventory items
   */ async getInventoryItems (filters) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/inventory', filters);
        if (response.status === 'success' && response.data) {
            return {
                items: Array.isArray(response.data) ? response.data : [],
                total: response.total || 0
            };
        }
        throw new Error(response.message || 'Failed to fetch inventory items');
    },
    /**
   * Get inventory item by ID
   */ async getInventoryItemById (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get(`/inventory/${id}`);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch inventory item');
    },
    /**
   * Create a new inventory item
   */ async createInventoryItem (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/inventory', data);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to create inventory item');
    },
    /**
   * Update an inventory item
   */ async updateInventoryItem (id, data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch(`/inventory/${id}`, data);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to update inventory item');
    },
    /**
   * Delete an inventory item
   */ async deleteInventoryItem (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete(`/inventory/${id}`);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to delete inventory item');
        }
    },
    /**
   * Get inventory metrics
   */ async getInventoryMetrics () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/inventory/metrics');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch inventory metrics');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/returnsService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "returnsService",
    ()=>returnsService
]);
/**
 * Returns API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const returnsService = {
    /**
   * Get all returns
   */ async getReturns (filters) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/returns', filters);
        if (response.status === 'success' && response.data) {
            return {
                returns: Array.isArray(response.data) ? response.data : [],
                total: response.total || 0
            };
        }
        throw new Error(response.message || 'Failed to fetch returns');
    },
    /**
   * Get return by ID
   */ async getReturnById (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get(`/returns/${id}`);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch return');
    },
    /**
   * Create a new return
   */ async createReturn (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/returns', data);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to create return');
    },
    /**
   * Update a return
   */ async updateReturn (id, data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch(`/returns/${id}`, data);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to update return');
    },
    /**
   * Delete a return
   */ async deleteReturn (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete(`/returns/${id}`);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to delete return');
        }
    },
    /**
   * Search return reports for stats/graph data
   * @param distributorId - The distributor ID
   * @param ndcCode - The NDC code
   * @param format - Format of the response (e.g., 'graph')
   * @param type - Type of product: 'full' or 'partial' (optional)
   */ async searchReturnReports (distributorId, ndcCode, format = 'graph', type) {
        const params = {
            distributor_id: distributorId,
            ndc_code: ndcCode,
            format: format
        };
        // Add type parameter if provided
        if (type) {
            params.type = type;
        }
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/return-reports/search', params);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch return reports');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/productsService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "productsService",
    ()=>productsService
]);
/**
 * Products/NDC API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const productsService = {
    /**
   * Validate NDC format and lookup product
   */ async validateNDC (ndc) {
        try {
            // Try POST first (body param)
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/ndc/validate', {
                ndc
            }, false);
            // The Next.js API route returns { valid: true, product: {...} } directly
            // But apiClient wraps it in ApiResponse format
            // Check both formats
            let responseData;
            if (response.status === 'success' && response.data) {
                responseData = response.data;
            } else if (response.valid !== undefined) {
                // Direct format from Next.js API route
                responseData = response;
            } else {
                responseData = response;
            }
            // Handle success response
            if (responseData.valid === true && responseData.product) {
                return {
                    valid: true,
                    product: responseData.product,
                    ndc: responseData.ndc || ndc
                };
            }
            // Handle error response
            if (responseData.error || responseData.valid === false) {
                return {
                    valid: false,
                    error: responseData.error || responseData.message || 'NDC validation failed',
                    suggestion: responseData.suggestion,
                    ndc: responseData.ndc || ndc
                };
            }
            throw new Error('Invalid response format from API');
        } catch (error) {
            // If POST fails, try GET
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/ndc/validate', {
                    ndc
                }, false);
                let responseData;
                if (response.status === 'success' && response.data) {
                    responseData = response.data;
                } else if (response.valid !== undefined) {
                    responseData = response;
                } else {
                    responseData = response;
                }
                if (responseData.valid === true && responseData.product) {
                    return {
                        valid: true,
                        product: responseData.product,
                        ndc: responseData.ndc || ndc
                    };
                }
                if (responseData.error || responseData.valid === false) {
                    return {
                        valid: false,
                        error: responseData.error || responseData.message || 'NDC validation failed',
                        suggestion: responseData.suggestion,
                        ndc: responseData.ndc || ndc
                    };
                }
            } catch (getError) {
                return {
                    valid: false,
                    error: getError.message || getError.error || 'NDC validation failed',
                    ndc
                };
            }
            return {
                valid: false,
                error: error.message || error.error || 'NDC validation failed',
                ndc
            };
        }
    },
    /**
   * Search products
   */ async searchProducts (searchTerm, limit = 20) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/products/search', {
            search: searchTerm,
            limit
        }, false);
        if (response.status === 'success' && response.data) {
            return Array.isArray(response.data) ? response.data : [];
        }
        throw new Error(response.message || 'Failed to search products');
    },
    /**
   * Create or update a product
   */ async createOrUpdateProduct (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/products', data, false);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to create/update product');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/productListsService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "productListsService",
    ()=>productListsService
]);
/**
 * Product Lists API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const productListsService = {
    /**
   * Get default product list (My Products)
   */ async getDefaultList () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/product-lists/default');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch default product list');
    },
    /**
   * Get all product list items directly
   * Uses GET /api/product-lists which returns items array
   */ async getItems () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/product-lists/items');
        if (response.status === 'success' && response.data) {
            return Array.isArray(response.data) ? response.data : [];
        }
        throw new Error(response.message || 'Failed to fetch product list items');
    },
    /**
   * Add item to product list directly
   * Uses POST /api/product-lists with the specified payload format
   */ async addItem (listId, item) {
        // Use POST /api/product-lists with the exact payload format specified
        // Backend will detect ndc/product_name and treat it as adding an item
        const payload = {
            ndc: item.ndc,
            product_name: item.product_name,
            lot_number: item.lot_number,
            expiration_date: item.expiration_date
        };
        // Include full_units and partial_units if provided
        if (item.full_units !== undefined) {
            payload.full_units = item.full_units;
        }
        if (item.partial_units !== undefined) {
            payload.partial_units = item.partial_units;
        }
        // Include quantity for backward compatibility if provided
        if (item.quantity !== undefined) {
            payload.quantity = item.quantity;
        }
        // Include notes if provided
        if (item.notes !== undefined) {
            payload.notes = item.notes;
        }
        // pharmacy_id is automatically added by apiClient
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/product-lists/items', payload);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to add item to list');
    },
    /**
   * Update item in product list
   */ async updateItem (itemId, item) {
        const payload = {};
        // Include all provided fields
        if (item.ndc !== undefined) payload.ndc = item.ndc;
        if (item.product_name !== undefined) payload.product_name = item.product_name;
        if (item.full_units !== undefined) payload.full_units = item.full_units;
        if (item.partial_units !== undefined) payload.partial_units = item.partial_units;
        if (item.quantity !== undefined) payload.quantity = item.quantity;
        if (item.lot_number !== undefined) payload.lot_number = item.lot_number;
        if (item.expiration_date !== undefined) payload.expiration_date = item.expiration_date;
        if (item.notes !== undefined) payload.notes = item.notes;
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put(`/product-lists/items/${itemId}`, payload);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to update item');
    },
    /**
   * Remove item from product list
   */ async removeItem (itemId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete(`/product-lists/items/${itemId}`);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to remove item from list');
        }
    },
    /**
   * Clear all items from product list
   */ async clearAllItems () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete('/product-lists/items');
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to clear all items');
        }
    },
    /**
   * Create a new product list
   */ async createList (name, items) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/product-lists', {
            name,
            items
        });
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to create product list');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/dashboardService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "dashboardService",
    ()=>dashboardService
]);
/**
 * Dashboard API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const dashboardService = {
    /**
   * Get dashboard summary statistics
   */ async getSummary () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/summary');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch dashboard summary');
    },
    /**
   * Get earnings history
   */ async getEarningsHistory (params) {
        const queryParams = {};
        if (params?.periodType) {
            queryParams.periodType = params.periodType;
        }
        if (params?.periods !== undefined) {
            queryParams.periods = params.periods.toString();
        }
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/earnings/history', queryParams);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch earnings history');
    },
    /**
   * Get earnings estimation
   */ async getEarningsEstimation (params) {
        const queryParams = {};
        if (params?.periodType) {
            queryParams.periodType = params.periodType;
        }
        if (params?.periods !== undefined) {
            queryParams.periods = params.periods.toString();
        }
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/earnings-estimation', queryParams);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch earnings estimation');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/creditsService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "creditsService",
    ()=>creditsService
]);
/**
 * Credits API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const creditsService = {
    /**
   * Estimate credits for return items
   */ async estimateCredits (items) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/credits/estimate', {
            items
        });
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to estimate credits');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/documentsService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "documentsService",
    ()=>documentsService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * Documents API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const documentsService = {
    /**
   * Get all documents
   */ async getDocuments (filters) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/documents', filters);
        if (response.status === 'success' && response.data) {
            // Transform API response (snake_case) to frontend format (camelCase)
            const documents = (Array.isArray(response.data) ? response.data : []).map((doc)=>({
                    id: doc.id,
                    pharmacyId: doc.pharmacy_id,
                    fileName: doc.file_name || '',
                    fileSize: doc.file_size || 0,
                    fileType: doc.file_type || 'application/pdf',
                    fileUrl: doc.file_url,
                    reverseDistributorId: doc.reverse_distributor_id || '',
                    reverseDistributorName: doc.reverse_distributor_name || 'Unknown Distributor',
                    source: doc.source || 'manual_upload',
                    status: doc.status || 'completed',
                    uploadedAt: doc.uploaded_at || doc.created_at || new Date().toISOString(),
                    processedAt: doc.processed_at,
                    errorMessage: doc.error_message,
                    extractedItems: doc.extracted_items || 0,
                    totalCreditAmount: doc.total_credit_amount,
                    processingProgress: doc.processing_progress
                }));
            return {
                documents,
                total: response.total || 0
            };
        }
        throw new Error(response.message || 'Failed to fetch documents');
    },
    /**
   * Get document by ID
   */ async getDocumentById (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get(`/documents/${id}`);
        if (response.status === 'success' && response.data) {
            const doc = response.data;
            // Transform API response (snake_case) to frontend format (camelCase)
            return {
                id: doc.id,
                pharmacyId: doc.pharmacy_id,
                fileName: doc.file_name || '',
                fileSize: doc.file_size || 0,
                fileType: doc.file_type || 'application/pdf',
                fileUrl: doc.file_url,
                reverseDistributorId: doc.reverse_distributor_id || '',
                reverseDistributorName: doc.reverse_distributor_name || 'Unknown Distributor',
                source: doc.source || 'manual_upload',
                status: doc.status || 'completed',
                uploadedAt: doc.uploaded_at || doc.created_at || new Date().toISOString(),
                processedAt: doc.processed_at,
                errorMessage: doc.error_message,
                extractedItems: doc.extracted_items || 0,
                totalCreditAmount: doc.total_credit_amount,
                processingProgress: doc.processing_progress
            };
        }
        throw new Error(response.message || 'Failed to fetch document');
    },
    /**
   * Delete a document
   */ async deleteDocument (id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete(`/documents/${id}`);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to delete document');
        }
    },
    /**
   * Upload and process a document
   */ async uploadDocument (file, reverseDistributorId) {
        const formData = new FormData();
        formData.append('file', file);
        if (reverseDistributorId) {
            formData.append('reverse_distributor_id', reverseDistributorId);
        }
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].upload('/return-reports/process', formData);
        if (response.status === 'success') {
            // If document is returned in response, transform it
            const doc = response.data || response.document;
            if (doc) {
                return {
                    id: doc.id,
                    pharmacyId: doc.pharmacy_id,
                    fileName: doc.file_name || file.name,
                    fileSize: doc.file_size || file.size,
                    fileType: doc.file_type || file.type,
                    fileUrl: doc.file_url,
                    reverseDistributorId: doc.reverse_distributor_id || '',
                    reverseDistributorName: doc.reverse_distributor_name || 'Unknown Distributor',
                    source: doc.source || 'manual_upload',
                    status: doc.status || 'completed',
                    uploadedAt: doc.uploaded_at || new Date().toISOString(),
                    processedAt: doc.processed_at,
                    errorMessage: doc.error_message,
                    extractedItems: doc.extracted_items || 0,
                    totalCreditAmount: doc.total_credit_amount,
                    processingProgress: doc.processing_progress
                };
            }
            // If no document returned, create a minimal one from the file
            return {
                id: '',
                pharmacyId: '',
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                reverseDistributorId: reverseDistributorId || '',
                reverseDistributorName: 'Unknown Distributor',
                source: 'manual_upload',
                status: 'completed',
                uploadedAt: new Date().toISOString(),
                extractedItems: 0
            };
        }
        throw new Error(response.message || 'Failed to upload document');
    },
    /**
   * Download a document file
   */ async downloadDocument (id) {
        const API_BASE_URL = ("TURBOPACK compile-time value", "http://localhost:3000/api") || 'https://pharmacy-backend-dusky.vercel.app/api';
        const { getToken, getPharmacyId, clearAuthCookies } = await __turbopack_context__.A("[project]/Frontend/lib/utils/cookies.ts [app-client] (ecmascript, async loader)");
        const url = `${API_BASE_URL}/documents/${id}/download`;
        const token = getToken();
        const pharmacyId = getPharmacyId();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const urlObj = new URL(url);
        if (pharmacyId) {
            urlObj.searchParams.append('pharmacy_id', pharmacyId);
        }
        const response = await fetch(urlObj.toString(), {
            method: 'GET',
            headers
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                if ("TURBOPACK compile-time truthy", 1) {
                    clearAuthCookies();
                    window.location.href = '/login';
                }
            }
            const errorText = await response.text();
            let errorMessage = 'Failed to download document';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch  {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.blob();
    },
    /**
   * View a document file (returns blob for viewing)
   */ async viewDocument (id) {
        const API_BASE_URL = ("TURBOPACK compile-time value", "http://localhost:3000/api") || 'https://pharmacy-backend-dusky.vercel.app/api';
        const { getToken, getPharmacyId, clearAuthCookies } = await __turbopack_context__.A("[project]/Frontend/lib/utils/cookies.ts [app-client] (ecmascript, async loader)");
        const url = `${API_BASE_URL}/documents/${id}/view`;
        const token = getToken();
        const pharmacyId = getPharmacyId();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const urlObj = new URL(url);
        if (pharmacyId) {
            urlObj.searchParams.append('pharmacy_id', pharmacyId);
        }
        const response = await fetch(urlObj.toString(), {
            method: 'GET',
            headers
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                if ("TURBOPACK compile-time truthy", 1) {
                    clearAuthCookies();
                    window.location.href = '/login';
                }
            }
            const errorText = await response.text();
            let errorMessage = 'Failed to view document';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch  {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return await response.blob();
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/optimizationService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "optimizationService",
    ()=>optimizationService
]);
/**
 * Optimization API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const optimizationService = {
    /**
   * Get optimization recommendations
   * @param input - Either a string (NDC codes) or array of items with ndc, fullCount, and partialCount
   */ async getRecommendations (input) {
        // Handle empty/undefined case
        if (!input || Array.isArray(input) && input.length === 0) {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/optimization/recommendations', undefined);
            if (response.status === 'success' && response.data) {
                return response.data;
            }
            throw new Error(response.message || 'Failed to fetch optimization recommendations');
        }
        // Handle string input (backward compatibility - just NDC codes)
        if (typeof input === 'string') {
            const params = {
                ndc: input
            };
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/optimization/recommendations', params);
            if (response.status === 'success' && response.data) {
                return response.data;
            }
            throw new Error(response.message || 'Failed to fetch optimization recommendations');
        }
        // Handle array input (new format with fullCount and partialCount)
        // Build comma-separated strings for each parameter
        // Format: ndc=47335-0685-83,55724-0211-21&FullCount=1,0&PartialCount=0,1
        const ndcList = [];
        const fullCountList = [];
        const partialCountList = [];
        input.forEach((item)=>{
            ndcList.push(item.ndc);
            fullCountList.push(item.fullCount.toString());
            partialCountList.push(item.partialCount.toString());
        });
        const params = {
            ndc: ndcList.join(','),
            FullCount: fullCountList.join(','),
            PartialCount: partialCountList.join(',')
        };
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/optimization/recommendations', params);
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch optimization recommendations');
    },
    /**
   * Get optimization suggestions based on selected NDCs and quantities
   * @param items - Array of items with NDC and quantity
   */ async getSuggestions (items) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/optimization/suggestions', {
            items
        });
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch optimization suggestions');
    },
    /**
   * Get package suggestions for products
   * @param items - Array of product items with NDC, productId, productName, full, and partial
   */ async getPackageSuggestions (items) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/optimization/packages/suggestions', {
            items
        });
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch package suggestions');
    },
    /**
   * Get distributor suggestion for selected items
   * @param distributorId - The distributor ID
   * @param items - Array of product items with NDC, productId, productName, full, and partial
   */ async getDistributorSuggestion (distributorId, items) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/optimization/packages/distributor-suggestion', {
            distributorId,
            items
        });
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch distributor suggestion');
    },
    /**
   * Create a custom package
   * @param packageData - Package data with items, distributor name and ID
   */ async createCustomPackage (packageData) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/optimization/custom-packages', packageData);
        if (response.status === 'success') {
            return response.data || response;
        }
        throw new Error(response.message || 'Failed to create custom package');
    },
    /**
   * Add items to an existing custom package
   * @param packageId - The ID of the existing package
   * @param items - Array of items to add to the package
   */ async addItemsToPackage (packageId, items) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch(`/optimization/custom-packages/${packageId}/add-items`, {
            items
        });
        if (response.status === 'success') {
            return response.data || response;
        }
        throw new Error(response.message || 'Failed to add items to package');
    },
    /**
   * Update a single package item
   * @param packageId - The ID of the package
   * @param itemId - The ID of the item to update
   * @param itemData - The updated item data
   */ async updatePackageItem (packageId, itemId, itemData) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch(`/optimization/custom-packages/${packageId}/items/${itemId}`, itemData);
        if (response.status === 'success') {
            return response.data || response;
        }
        throw new Error(response.message || 'Failed to update package item');
    },
    /**
   * Delete a single package item
   * @param packageId - The ID of the package
   * @param itemId - The ID of the item to delete
   */ async deletePackageItem (packageId, itemId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete(`/optimization/custom-packages/${packageId}/items/${itemId}`);
        if (response.status === 'success') {
            return response.data || response;
        }
        throw new Error(response.message || 'Failed to delete package item');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/packagesService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "packagesService",
    ()=>packagesService
]);
/**
 * Packages API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const packagesService = {
    /**
   * Get packages
   */ async getPackages () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/optimization/packages');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch packages');
    },
    /**
   * Get custom packages
   */ async getCustomPackages () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/optimization/custom-packages');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch custom packages');
    },
    /**
   * Get suggested packages
   */ async getSuggestedPackages () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/optimization/packages');
        if (response.status === 'success' && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch suggested packages');
    },
    /**
   * Delete a custom package
   * @param packageId - The package ID of the package to delete
   */ async deletePackage (packageId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete(`/optimization/custom-packages/${packageId}`);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to delete package');
        }
    },
    /**
   * Update package status
   * @param packageId - The package ID
   * @param status - The new status (true for delivered, false for pending)
   * @param deliveryInfo - Optional delivery information
   */ async updatePackageStatus (packageId, status, deliveryInfo) {
        const payload = {};
        if (deliveryInfo) {
            payload.deliveryInfo = deliveryInfo;
        }
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch(`/optimization/custom-packages/${packageId}/mark-status`, payload);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to update package status');
        }
        return response.data || response;
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/distributorsService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "distributorsService",
    ()=>distributorsService
]);
/**
 * Distributors API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const distributorsService = {
    /**
   * Get top distributors
   */ async getTopDistributors () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].getApiWithoutPharmacyId('/distributors/top');
        if (response.status === 'success' && response.data) {
            // Transform API response
            const distributors = Array.isArray(response.data) ? response.data : [];
            const transformedDistributors = distributors.map((dist)=>({
                    id: dist.id,
                    name: dist.name,
                    code: dist.code,
                    email: dist.email,
                    phone: dist.phone,
                    location: dist.location,
                    active: dist.active !== undefined ? dist.active : false,
                    documentCount: dist.documentCount || dist.document_count,
                    totalCreditAmount: dist.totalCreditAmount || dist.total_credit_amount,
                    lastActivityDate: dist.lastActivityDate || dist.last_activity_date
                }));
            return {
                distributors: transformedDistributors,
                total: transformedDistributors.length
            };
        }
        throw new Error(response.message || 'Failed to fetch top distributors');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/settingsService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "settingsService",
    ()=>settingsService
]);
/**
 * Settings API Service
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const settingsService = {
    /**
   * Get user settings/profile
   */ async getSettings () {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/settings');
        if (response.status === 'success' && response.data) {
            // Transform snake_case API response to camelCase
            const apiData = response.data;
            return {
                name: apiData.name,
                email: apiData.email,
                phone: apiData.phone,
                title: apiData.title || undefined,
                pharmacyName: apiData.pharmacy_name,
                npiNumber: apiData.npi_number,
                deaNumber: apiData.dea_number,
                physicalAddress: apiData.address
            };
        }
        throw new Error(response.message || 'Failed to fetch settings');
    },
    /**
   * Update user profile
   * Only sends fields that are updated
   */ async updateProfile (data) {
        // Transform camelCase to snake_case for API
        const apiData = {};
        if (data.name !== undefined) apiData.name = data.name;
        if (data.email !== undefined) apiData.email = data.email;
        if (data.phone !== undefined) apiData.phone = data.phone;
        if (data.title !== undefined) apiData.title = data.title;
        if (data.pharmacyName !== undefined) apiData.pharmacy_name = data.pharmacyName;
        if (data.npiNumber !== undefined) apiData.npi_number = data.npiNumber;
        if (data.deaNumber !== undefined) apiData.dea_number = data.deaNumber;
        if (data.physicalAddress !== undefined) apiData.physical_address = data.physicalAddress;
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch('/settings', apiData);
        if (response.status === 'success' && response.data) {
            // Transform snake_case API response to camelCase
            const apiResponse = response.data;
            return {
                name: apiResponse.name,
                email: apiResponse.email,
                phone: apiResponse.phone,
                title: apiResponse.title || undefined,
                pharmacyName: apiResponse.pharmacy_name,
                npiNumber: apiResponse.npi_number,
                deaNumber: apiResponse.dea_number,
                physicalAddress: apiResponse.address
            };
        }
        throw new Error(response.message || 'Failed to update profile');
    },
    /**
   * Change password
   */ async changePassword (data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/settings/change-password', data);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to change password');
        }
    }
};
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
"[project]/Frontend/lib/api/services/subscriptionService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cancelSubscription",
    ()=>cancelSubscription,
    "changeSubscriptionPlan",
    ()=>changeSubscriptionPlan,
    "createCheckoutSession",
    ()=>createCheckoutSession,
    "createPortalSession",
    ()=>createPortalSession,
    "getSubscription",
    ()=>getSubscription,
    "getSubscriptionPlanById",
    ()=>getSubscriptionPlanById,
    "getSubscriptionPlans",
    ()=>getSubscriptionPlans,
    "reactivateSubscription",
    ()=>reactivateSubscription
]);
/**
 * Subscription Service
 * Handles all subscription-related API calls
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/client.ts [app-client] (ecmascript)");
;
const getSubscriptionPlans = async ()=>{
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/subscriptions/plans', {}, false);
    return response.data || [];
};
const getSubscriptionPlanById = async (planId)=>{
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get(`/subscriptions/plans/${planId}`, {}, false);
    if (!response.data) {
        throw new Error('Plan not found');
    }
    return response.data;
};
const getSubscription = async ()=>{
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/subscriptions');
    return response.data || null;
};
const createCheckoutSession = async (planId, billingInterval)=>{
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/subscriptions/checkout', {
        planId,
        billingInterval
    });
    if (!response.data) {
        throw new Error('Failed to create checkout session');
    }
    return response.data;
};
const createPortalSession = async (returnUrl)=>{
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/subscriptions/portal', {
        returnUrl
    });
    if (!response.data) {
        throw new Error('Failed to create portal session');
    }
    return response.data;
};
const cancelSubscription = async ()=>{
    await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/subscriptions/cancel', {});
};
const reactivateSubscription = async ()=>{
    await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/subscriptions/reactivate', {});
};
const changeSubscriptionPlan = async (planId, billingInterval)=>{
    await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/subscriptions/change-plan', {
        planId,
        billingInterval
    });
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/api/services/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
/**
 * API Services Index
 * Central export for all API services
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$authService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/authService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$inventoryService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/inventoryService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$returnsService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/returnsService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$productsService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/productsService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$productListsService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/productListsService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$dashboardService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/dashboardService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$creditsService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/creditsService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$documentsService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/documentsService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$optimizationService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/optimizationService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$packagesService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/packagesService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$distributorsService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/distributorsService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$settingsService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/settingsService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/marketplaceService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$subscriptionService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/subscriptionService.ts [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/components/layout/UserDropdown.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UserDropdown",
    ()=>UserDropdown
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/log-out.js [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$authService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/authService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cookies.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function UserDropdown() {
    _s();
    const [isOpen, setIsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [userData, setUserData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const dropdownRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const loadUserData = ()=>{
        // Get user data from cookies
        const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cookies$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUserData"])();
        if (data?.user) {
            setUserData({
                name: data.user.name,
                pharmacy_name: data.user.pharmacy_name
            });
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserDropdown.useEffect": ()=>{
            // Load user data on mount
            loadUserData();
            // Listen for user data updates
            const handleUserDataUpdate = {
                "UserDropdown.useEffect.handleUserDataUpdate": (event)=>{
                    const updatedData = event.detail;
                    if (updatedData?.user) {
                        setUserData({
                            name: updatedData.user.name,
                            pharmacy_name: updatedData.user.pharmacy_name
                        });
                    }
                }
            }["UserDropdown.useEffect.handleUserDataUpdate"];
            window.addEventListener('userDataUpdated', handleUserDataUpdate);
            return ({
                "UserDropdown.useEffect": ()=>{
                    window.removeEventListener('userDataUpdated', handleUserDataUpdate);
                }
            })["UserDropdown.useEffect"];
        }
    }["UserDropdown.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserDropdown.useEffect": ()=>{
            // Close dropdown when clicking outside
            const handleClickOutside = {
                "UserDropdown.useEffect.handleClickOutside": (event)=>{
                    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                        setIsOpen(false);
                    }
                }
            }["UserDropdown.useEffect.handleClickOutside"];
            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
            }
            return ({
                "UserDropdown.useEffect": ()=>{
                    document.removeEventListener('mousedown', handleClickOutside);
                }
            })["UserDropdown.useEffect"];
        }
    }["UserDropdown.useEffect"], [
        isOpen
    ]);
    const handleLogout = ()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$authService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authService"].signout();
        router.push('/login');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        ref: dropdownRef,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setIsOpen(!isOpen),
                className: "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-accent transition-colors",
                "aria-label": "User menu",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-right hidden sm:block",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm font-medium",
                                children: userData?.name || 'User'
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: userData?.pharmacy_name || 'Pharmacy'
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-teal-600 text-white",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                            className: "h-4 w-4 sm:h-5 sm:w-5"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                            lineNumber: 84,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                        lineNumber: 83,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                        className: `h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`
                    }, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                        lineNumber: 86,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, this),
            isOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-card border border-border z-50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "py-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-4 py-3 border-b border-border",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm font-medium",
                                    children: userData?.name || 'User'
                                }, void 0, false, {
                                    fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                                    lineNumber: 93,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground truncate",
                                    children: userData?.pharmacy_name || 'Pharmacy'
                                }, void 0, false, {
                                    fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                                    lineNumber: 94,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                            lineNumber: 92,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                setIsOpen(false);
                                router.push('/settings');
                            // Add settings navigation if needed
                            },
                            className: "w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                    className: "h-4 w-4"
                                }, void 0, false, {
                                    fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                                    lineNumber: 106,
                                    columnNumber: 15
                                }, this),
                                "Settings"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                            lineNumber: 98,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleLogout,
                            className: "w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                    className: "h-4 w-4"
                                }, void 0, false, {
                                    fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                                    lineNumber: 113,
                                    columnNumber: 15
                                }, this),
                                "Logout"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                            lineNumber: 109,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                    lineNumber: 91,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
                lineNumber: 90,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Frontend/components/layout/UserDropdown.tsx",
        lineNumber: 71,
        columnNumber: 5
    }, this);
}
_s(UserDropdown, "FP5IDG5PIeIhxBuJr8nMGWQjxMs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = UserDropdown;
var _c;
__turbopack_context__.k.register(_c, "UserDropdown");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/components/ui/Button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cn.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
;
;
const Button = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c = ({ className, variant = 'primary', size = 'md', ...props }, ref)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2', 'disabled:pointer-events-none disabled:opacity-50', {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive'
        }, {
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8 text-lg': size === 'lg'
        }, className),
        ref: ref,
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Button.tsx",
        lineNumber: 12,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = Button;
Button.displayName = 'Button';
;
var _c, _c1;
__turbopack_context__.k.register(_c, "Button$forwardRef");
__turbopack_context__.k.register(_c1, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/lib/store/marketplaceStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMarketplaceStore",
    ()=>useMarketplaceStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/marketplaceService.ts [app-client] (ecmascript)");
;
;
const useMarketplaceStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
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
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].getDeals(mergedFilters);
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
                const deal = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].getDealById(id);
                return deal;
            } catch (error) {
                console.error('Failed to fetch deal:', error);
                return null;
            }
        },
        fetchCategories: async ()=>{
            try {
                const categories = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].getCategories();
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
                const cart = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].getCart();
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
                const count = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].getCartCount();
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
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].addToCart(dealId, quantity);
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
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].updateCartItem(itemId, quantity);
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
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].removeFromCart(itemId);
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
                await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$marketplaceService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["marketplaceService"].clearCart();
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/components/layout/TopBar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TopBar",
    ()=>TopBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/shopping-cart.js [app-client] (ecmascript) <export default as ShoppingCart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$UserDropdown$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/layout/UserDropdown.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/ui/Button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/store/marketplaceStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function TopBar({ onMenuClick }) {
    _s();
    const { cartItems, toggleCart } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMarketplaceStore"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "flex h-14 sm:h-16 items-center justify-between border-b bg-card px-4 sm:px-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 sm:gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        variant: "ghost",
                        size: "sm",
                        className: "lg:hidden",
                        onClick: onMenuClick,
                        "aria-label": "Open menu",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                            lineNumber: 26,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                        lineNumber: 19,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-lg sm:text-xl font-semibold text-teal-600",
                        children: "PharmAnalytics"
                    }, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                        lineNumber: 28,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 sm:gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                        variant: "ghost",
                        size: "sm",
                        className: "relative",
                        onClick: toggleCart,
                        "aria-label": "Shopping cart",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                                lineNumber: 40,
                                columnNumber: 11
                            }, this),
                            cartItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center",
                                children: cartItems.length
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                                lineNumber: 42,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$UserDropdown$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UserDropdown"], {}, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                        lineNumber: 47,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/components/layout/TopBar.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Frontend/components/layout/TopBar.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_s(TopBar, "m4f5rirZTLjInkz/HDK+9GFtFdQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMarketplaceStore"]
    ];
});
_c = TopBar;
var _c;
__turbopack_context__.k.register(_c, "TopBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
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
"[project]/Frontend/components/ui/Badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cn.ts [app-client] (ecmascript)");
;
;
function Badge({ className, variant = 'default', ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors', {
            'bg-primary text-primary-foreground': variant === 'default',
            'bg-green-100 text-green-800': variant === 'success',
            'bg-yellow-100 text-yellow-800': variant === 'warning',
            'bg-red-100 text-red-800': variant === 'error',
            'bg-blue-100 text-blue-800': variant === 'info',
            'bg-secondary text-secondary-foreground': variant === 'secondary',
            'bg-destructive text-destructive-foreground': variant === 'destructive'
        }, className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Badge.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
_c = Badge;
var _c;
__turbopack_context__.k.register(_c, "Badge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/components/marketplace/CartDrawer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CartDrawer",
    ()=>CartDrawer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/store/marketplaceStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Minus$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/minus.js [app-client] (ecmascript) <export default as Minus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/shopping-cart.js [app-client] (ecmascript) <export default as ShoppingCart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/ui/Badge.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function CartDrawer() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [updatingItems, setUpdatingItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const [removingItems, setRemovingItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const { cartItems, cartSummary, isCartOpen, isCartLoading, cartError, toggleCart, closeCart, removeFromCart, updateCartItemQuantity, clearCart, getCartSubtotal, getTotalSavings, getCartTotal } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMarketplaceStore"])();
    if (!isCartOpen) return null;
    const subtotal = cartSummary?.subtotal ?? getCartSubtotal();
    const savings = cartSummary?.totalSavings ?? getTotalSavings();
    const estimatedTax = cartSummary?.estimatedTax ?? subtotal * 0.08;
    const total = cartSummary?.total ?? getCartTotal();
    const handleUpdateQuantity = async (itemId, newQuantity)=>{
        if (newQuantity < 1) return;
        setUpdatingItems((prev)=>new Set(prev).add(itemId));
        await updateCartItemQuantity(itemId, newQuantity);
        setUpdatingItems((prev)=>{
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
        });
    };
    const handleRemoveItem = async (itemId)=>{
        setRemovingItems((prev)=>new Set(prev).add(itemId));
        await removeFromCart(itemId);
        setRemovingItems((prev)=>{
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
        });
    };
    const handleClearCart = async ()=>{
        if (confirm('Are you sure you want to clear your entire cart?')) {
            await clearCart();
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300",
                onClick: closeCart
            }, void 0, false, {
                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between p-4 border-b",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-lg font-bold",
                                        children: "Shopping Cart"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 79,
                                        columnNumber: 13
                                    }, this),
                                    cartSummary && cartSummary.itemCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                        variant: "secondary",
                                        className: "text-xs",
                                        children: [
                                            cartSummary.itemCount,
                                            " ",
                                            cartSummary.itemCount === 1 ? 'item' : 'items'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 81,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: closeCart,
                                className: "p-1.5 hover:bg-accent rounded-lg transition-colors",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "h-5 w-5"
                                }, void 0, false, {
                                    fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                    lineNumber: 90,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, this),
                    cartError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-3 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-destructive text-xs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                className: "h-4 w-4"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 97,
                                columnNumber: 13
                            }, this),
                            cartError
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                        lineNumber: 96,
                        columnNumber: 11
                    }, this),
                    isCartLoading && cartItems.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 flex flex-col items-center justify-center p-8 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                className: "h-8 w-8 animate-spin text-primary mb-3"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 105,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-muted-foreground",
                                children: "Loading cart..."
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 106,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                        lineNumber: 104,
                        columnNumber: 11
                    }, this) : cartItems.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 flex flex-col items-center justify-center p-8 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"], {
                                className: "h-16 w-16 text-muted-foreground/30 mb-3"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 110,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-base font-bold mb-1",
                                children: "Your cart is empty"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 111,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-muted-foreground mb-4",
                                children: "Add some deals to get started!"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 112,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: closeCart,
                                className: "px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-xs font-medium transition-all shadow-sm",
                                children: "Browse Deals"
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 113,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                        lineNumber: 109,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 overflow-y-auto p-3 space-y-2",
                                children: cartItems.map((item)=>{
                                    const isUpdating = updatingItems.has(item.id);
                                    const isRemoving = removingItems.has(item.id);
                                    const isItemDisabled = isUpdating || isRemoving;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `grid grid-cols-[60px_1fr_auto] gap-3 p-2.5 bg-muted/50 rounded-lg border ${isRemoving ? 'opacity-50' : ''}`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-[60px] h-[60px] bg-card rounded border flex items-center justify-center overflow-hidden relative",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: item.imageUrl || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&h=120&fit=crop&q=80&${item.id}`,
                                                        alt: item.productName,
                                                        className: "w-full h-full object-cover"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 135,
                                                        columnNumber: 23
                                                    }, this),
                                                    item.dealStatus !== 'active' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-0 bg-black/50 flex items-center justify-center",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                            variant: "destructive",
                                                            className: "text-[10px]",
                                                            children: item.dealStatus === 'sold' ? 'Sold' : 'Expired'
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                            lineNumber: 143,
                                                            columnNumber: 27
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 142,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 134,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-col gap-1.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                        className: "font-semibold text-sm leading-tight line-clamp-2",
                                                        children: item.productName
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 152,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-wrap gap-1 text-[10px] text-muted-foreground",
                                                        children: [
                                                            item.ndc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-mono",
                                                                children: [
                                                                    "NDC: ",
                                                                    item.ndc
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                lineNumber: 154,
                                                                columnNumber: 38
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: [
                                                                    "• ",
                                                                    item.distributor
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                lineNumber: 155,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 153,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-1.5",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleUpdateQuantity(item.id, item.quantity - 1),
                                                                disabled: isItemDisabled || item.quantity <= 1,
                                                                className: "w-6 h-6 border rounded hover:bg-accent flex items-center justify-center transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Minus$3e$__["Minus"], {
                                                                    className: "h-3 w-3"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                    lineNumber: 165,
                                                                    columnNumber: 27
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                lineNumber: 160,
                                                                columnNumber: 25
                                                            }, this),
                                                            isUpdating ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "w-10 h-6 flex items-center justify-center",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                                    className: "h-3 w-3 animate-spin"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                    lineNumber: 169,
                                                                    columnNumber: 29
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                lineNumber: 168,
                                                                columnNumber: 27
                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "number",
                                                                value: item.quantity,
                                                                onChange: (e)=>{
                                                                    const qty = parseInt(e.target.value);
                                                                    if (qty > 0 && qty <= item.availableQuantity) {
                                                                        handleUpdateQuantity(item.id, qty);
                                                                    }
                                                                },
                                                                disabled: isItemDisabled,
                                                                className: "w-10 h-6 text-center border rounded text-xs font-semibold bg-card disabled:opacity-50",
                                                                min: "1",
                                                                max: item.availableQuantity
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                lineNumber: 172,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleUpdateQuantity(item.id, item.quantity + 1),
                                                                disabled: isItemDisabled || item.quantity >= item.availableQuantity,
                                                                className: "w-6 h-6 border rounded hover:bg-accent flex items-center justify-center transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                                    className: "h-3 w-3"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                    lineNumber: 192,
                                                                    columnNumber: 27
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                                lineNumber: 187,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 159,
                                                        columnNumber: 23
                                                    }, this),
                                                    item.quantity >= item.availableQuantity && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[10px] text-orange-600",
                                                        children: [
                                                            "Max available: ",
                                                            item.availableQuantity
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 198,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 151,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-col items-end gap-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-muted-foreground",
                                                        children: [
                                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(item.unitPrice),
                                                            " ea"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 204,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-bold",
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(item.totalPrice)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 205,
                                                        columnNumber: 23
                                                    }, this),
                                                    item.savings > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[10px] text-green-600",
                                                        children: [
                                                            "Save ",
                                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(item.savings)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 207,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>handleRemoveItem(item.id),
                                                        disabled: isRemoving,
                                                        className: "p-1 text-destructive hover:bg-destructive/10 rounded transition-colors mt-auto disabled:opacity-50",
                                                        children: isRemoving ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                            className: "h-3.5 w-3.5 animate-spin"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                            lineNumber: 215,
                                                            columnNumber: 27
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                            className: "h-3.5 w-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                            lineNumber: 217,
                                                            columnNumber: 27
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                        lineNumber: 209,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 203,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 129,
                                        columnNumber: 19
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 122,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-t p-3 space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between text-xs",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-muted-foreground",
                                                children: "Subtotal"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 229,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-semibold",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(subtotal)
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 230,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 228,
                                        columnNumber: 15
                                    }, this),
                                    savings > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between text-xs font-semibold text-green-600",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Total Savings"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 234,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "−",
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(savings)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 235,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 233,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between text-xs",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-muted-foreground",
                                                children: "Estimated Tax (8%)"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 239,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-semibold",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(estimatedTax)
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 240,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 238,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between text-xs",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-muted-foreground",
                                                children: "Shipping"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 243,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-semibold text-green-600",
                                                children: "Free"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 244,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 242,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-px bg-border my-1.5"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 246,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between text-sm font-bold",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Total"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 248,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(total)
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 249,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 247,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 227,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-3 pt-0 space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            closeCart();
                                            router.push('/marketplace/checkout');
                                        },
                                        disabled: isCartLoading,
                                        className: "w-full px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1 text-xs font-medium transition-all shadow-sm",
                                        children: [
                                            "Proceed to Checkout",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "h-4 w-4",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M9 5l7 7-7 7"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                    lineNumber: 265,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 264,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 255,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: closeCart,
                                                className: "flex-1 px-3 py-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-xs font-medium transition-all",
                                                children: "Continue Shopping"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 269,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: handleClearCart,
                                                disabled: isCartLoading,
                                                className: "px-3 py-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-md text-xs font-medium transition-all disabled:opacity-50",
                                                children: "Clear Cart"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                                lineNumber: 275,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                        lineNumber: 268,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                                lineNumber: 254,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/components/marketplace/CartDrawer.tsx",
                lineNumber: 75,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(CartDrawer, "tFsNugaNJH39R97KwDZyVtaocGE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$store$2f$marketplaceStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMarketplaceStore"]
    ];
});
_c = CartDrawer;
var _c;
__turbopack_context__.k.register(_c, "CartDrawer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/components/layout/DashboardLayout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DashboardLayout",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/layout/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$TopBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/layout/TopBar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$marketplace$2f$CartDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/marketplace/CartDrawer.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function DashboardLayout({ children }) {
    _s();
    const [sidebarOpen, setSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-screen overflow-hidden bg-background",
        children: [
            sidebarOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/50 z-40 lg:hidden",
                onClick: ()=>setSidebarOpen(false)
            }, void 0, false, {
                fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
                lineNumber: 18,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {
                    onClose: ()=>setSidebarOpen(false)
                }, void 0, false, {
                    fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
                    lineNumber: 32,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-1 flex-col overflow-hidden w-full lg:w-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$TopBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TopBar"], {
                        onMenuClick: ()=>setSidebarOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-1 overflow-y-auto p-4 sm:p-4",
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$marketplace$2f$CartDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartDrawer"], {}, void 0, false, {
                fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Frontend/components/layout/DashboardLayout.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_s(DashboardLayout, "5rGDkYpGQ8fHM9RkMWnKOwsxadk=");
_c = DashboardLayout;
var _c;
__turbopack_context__.k.register(_c, "DashboardLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/components/ui/Card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/cn.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
;
;
const Card = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('rounded-lg border bg-card text-card-foreground shadow-sm', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Card.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = Card;
Card.displayName = 'Card';
const CardHeader = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c2 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex flex-col space-y-1.5 p-6', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Card.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c3 = CardHeader;
CardHeader.displayName = 'CardHeader';
const CardTitle = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c4 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('text-2xl font-semibold leading-none tracking-tight', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Card.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c5 = CardTitle;
CardTitle.displayName = 'CardTitle';
const CardDescription = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c6 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('text-sm text-muted-foreground', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Card.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c7 = CardDescription;
CardDescription.displayName = 'CardDescription';
const CardContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c8 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('p-6 pt-0', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Card.tsx",
        lineNumber: 53,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c9 = CardContent;
CardContent.displayName = 'CardContent';
const CardFooter = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c10 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex items-center p-6 pt-0', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Frontend/components/ui/Card.tsx",
        lineNumber: 60,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c11 = CardFooter;
CardFooter.displayName = 'CardFooter';
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "Card$forwardRef");
__turbopack_context__.k.register(_c1, "Card");
__turbopack_context__.k.register(_c2, "CardHeader$forwardRef");
__turbopack_context__.k.register(_c3, "CardHeader");
__turbopack_context__.k.register(_c4, "CardTitle$forwardRef");
__turbopack_context__.k.register(_c5, "CardTitle");
__turbopack_context__.k.register(_c6, "CardDescription$forwardRef");
__turbopack_context__.k.register(_c7, "CardDescription");
__turbopack_context__.k.register(_c8, "CardContent$forwardRef");
__turbopack_context__.k.register(_c9, "CardContent");
__turbopack_context__.k.register(_c10, "CardFooter$forwardRef");
__turbopack_context__.k.register(_c11, "CardFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Frontend/app/(dashboard)/dashboard/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$DashboardLayout$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/layout/DashboardLayout.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/components/ui/Card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/building-2.js [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/box.js [app-client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-client] (ecmascript) <export default as DollarSign>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/Frontend/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$dashboardService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/api/services/dashboardService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/lib/utils/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/chart/BarChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/cartesian/Bar.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/chart/LineChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/cartesian/Line.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/cartesian/XAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/cartesian/YAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/component/Legend.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Frontend/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
function DashboardPage() {
    _s();
    const [summary, setSummary] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [earningsData, setEarningsData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [earningsLoading, setEarningsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [earningsEstimation, setEarningsEstimation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [estimationLoading, setEstimationLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [periodType, setPeriodType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('monthly');
    const [periods, setPeriods] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(12);
    const [periodsInput, setPeriodsInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('12');
    const [estimationPeriodType, setEstimationPeriodType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('monthly');
    const [estimationPeriods, setEstimationPeriods] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(12);
    const [estimationPeriodsInput, setEstimationPeriodsInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('12');
    const debounceTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const estimationDebounceTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Get max periods based on period type
    const maxPeriods = periodType === 'monthly' ? 12 : 10;
    const maxEstimationPeriods = estimationPeriodType === 'monthly' ? 12 : 10;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardPage.useEffect": ()=>{
            loadDashboardData();
            loadEarningsEstimation();
        }
    }["DashboardPage.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardPage.useEffect": ()=>{
            loadEarningsHistory();
        }
    }["DashboardPage.useEffect"], [
        periodType,
        periods
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardPage.useEffect": ()=>{
            loadEarningsEstimation();
        }
    }["DashboardPage.useEffect"], [
        estimationPeriodType,
        estimationPeriods
    ]);
    // Sync periodsInput when periods changes externally (e.g., when periodType changes)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardPage.useEffect": ()=>{
            setPeriodsInput(periods.toString());
        }
    }["DashboardPage.useEffect"], [
        periods
    ]);
    // Sync estimationPeriodsInput when estimationPeriods changes externally
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardPage.useEffect": ()=>{
            setEstimationPeriodsInput(estimationPeriods.toString());
        }
    }["DashboardPage.useEffect"], [
        estimationPeriods
    ]);
    // Debounce periods input
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardPage.useEffect": ()=>{
            // Only debounce if the input value is different from current periods
            const inputValue = parseInt(periodsInput) || 1;
            if (inputValue === periods) {
                return; // No need to update if values match
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout({
                "DashboardPage.useEffect": ()=>{
                    const value = parseInt(periodsInput) || 1;
                    const clampedValue = Math.min(Math.max(1, value), maxPeriods);
                    if (clampedValue !== periods) {
                        setPeriods(clampedValue);
                    }
                }
            }["DashboardPage.useEffect"], 800); // 800ms debounce delay
            return ({
                "DashboardPage.useEffect": ()=>{
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }
                }
            })["DashboardPage.useEffect"];
        }
    }["DashboardPage.useEffect"], [
        periodsInput,
        maxPeriods,
        periods
    ]);
    // Debounce estimation periods input
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardPage.useEffect": ()=>{
            // Only debounce if the input value is different from current estimationPeriods
            const inputValue = parseInt(estimationPeriodsInput) || 1;
            if (inputValue === estimationPeriods) {
                return; // No need to update if values match
            }
            if (estimationDebounceTimerRef.current) {
                clearTimeout(estimationDebounceTimerRef.current);
            }
            estimationDebounceTimerRef.current = setTimeout({
                "DashboardPage.useEffect": ()=>{
                    const value = parseInt(estimationPeriodsInput) || 1;
                    const clampedValue = Math.min(Math.max(1, value), maxEstimationPeriods);
                    if (clampedValue !== estimationPeriods) {
                        setEstimationPeriods(clampedValue);
                    }
                }
            }["DashboardPage.useEffect"], 800); // 800ms debounce delay
            return ({
                "DashboardPage.useEffect": ()=>{
                    if (estimationDebounceTimerRef.current) {
                        clearTimeout(estimationDebounceTimerRef.current);
                    }
                }
            })["DashboardPage.useEffect"];
        }
    }["DashboardPage.useEffect"], [
        estimationPeriodsInput,
        maxEstimationPeriods,
        estimationPeriods
    ]);
    const loadDashboardData = async ()=>{
        try {
            setLoading(true);
            const summaryData = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$dashboardService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dashboardService"].getSummary();
            setSummary(summaryData);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally{
            setLoading(false);
        }
    };
    const loadEarningsHistory = async ()=>{
        try {
            setEarningsLoading(true);
            const earningsHistory = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$dashboardService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dashboardService"].getEarningsHistory({
                periodType,
                periods
            });
            setEarningsData(earningsHistory);
        } catch (err) {
            console.error('Failed to load earnings history:', err);
        } finally{
            setEarningsLoading(false);
        }
    };
    const loadEarningsEstimation = async ()=>{
        try {
            setEstimationLoading(true);
            const estimation = await __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$api$2f$services$2f$dashboardService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dashboardService"].getEarningsEstimation({
                periodType: estimationPeriodType,
                periods: estimationPeriods
            });
            setEarningsEstimation(estimation);
        } catch (err) {
            console.error('Failed to load earnings estimation:', err);
        } finally{
            setEstimationLoading(false);
        }
    };
    // Prepare chart data
    const chartData = earningsData?.periodEarnings.map((item)=>({
            period: item.label,
            earnings: item.earnings,
            documents: item.documentsCount
        })) || [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$layout$2f$DashboardLayout$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DashboardLayout"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-2 p-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-lg sm:text-xl font-bold text-gray-900",
                    children: "Dashboard"
                }, void 0, false, {
                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                    lineNumber: 181,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-2 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-all cursor-pointer shadow-sm hover:shadow-md",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                className: "h-3 w-3 text-teal-600"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 188,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] sm:text-xs text-teal-700 font-medium",
                                                children: "Pharmacy Added Products"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 189,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 187,
                                        columnNumber: 17
                                    }, this),
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "h-4 w-4 animate-spin text-teal-600"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 192,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm sm:text-base font-bold text-teal-900 whitespace-nowrap",
                                        children: summary?.totalPharmacyAddedProducts ?? 0
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 194,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 186,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 185,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-2 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 transition-all cursor-pointer shadow-sm hover:shadow-md",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                                                className: "h-3 w-3 text-cyan-600"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 201,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] sm:text-xs text-cyan-700 font-medium",
                                                children: "Top Distributors"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 202,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 200,
                                        columnNumber: 17
                                    }, this),
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "h-4 w-4 animate-spin text-cyan-600"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 205,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm sm:text-base font-bold text-cyan-900 whitespace-nowrap",
                                        children: summary?.topDistributorCount ?? 0
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 207,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 199,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 198,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-2 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer shadow-sm hover:shadow-md",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                                                className: "h-3 w-3 text-blue-600"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 214,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] sm:text-xs text-blue-700 font-medium",
                                                children: "Total Packages"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 215,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 213,
                                        columnNumber: 17
                                    }, this),
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "h-4 w-4 animate-spin text-blue-600"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 218,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm sm:text-base font-bold text-blue-900 whitespace-nowrap",
                                        children: summary?.totalPackages ?? 0
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 220,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 212,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 211,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-2 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all cursor-pointer shadow-sm hover:shadow-md",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                                                className: "h-3 w-3 text-green-600"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 227,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] sm:text-xs text-green-700 font-medium",
                                                children: "Delivered Packages"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 228,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 226,
                                        columnNumber: 17
                                    }, this),
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "h-4 w-4 animate-spin text-green-600"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 231,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm sm:text-base font-bold text-green-900 whitespace-nowrap",
                                        children: summary?.deliveredPackages ?? 0
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 233,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 225,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 224,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-2 rounded-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 transition-all cursor-pointer shadow-sm hover:shadow-md",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                                                className: "h-3 w-3 text-red-600"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 240,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] sm:text-xs text-red-700 font-medium",
                                                children: "Non-Delivered Packages"
                                            }, void 0, false, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 241,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 239,
                                        columnNumber: 17
                                    }, this),
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "h-4 w-4 animate-spin text-red-600"
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 244,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm sm:text-base font-bold text-red-900 whitespace-nowrap",
                                        children: summary?.nonDeliveredPackages ?? 0
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 246,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 238,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 237,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                    lineNumber: 184,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                            className: "border-2 border-teal-200",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                className: "p-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__["DollarSign"], {
                                                    className: "h-3 w-3 text-teal-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 258,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] sm:text-xs text-teal-700 font-medium",
                                                    children: "Total Earnings"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 259,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 257,
                                            columnNumber: 17
                                        }, this),
                                        earningsLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                            className: "h-4 w-4 animate-spin text-teal-600"
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 262,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm sm:text-base font-bold text-teal-700 whitespace-nowrap",
                                            children: earningsData ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(earningsData.totalEarnings) : '$0.00'
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 264,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                    lineNumber: 256,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 255,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 254,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                            className: "border-2 border-teal-200",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                className: "p-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                                    className: "h-3 w-3 text-teal-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 275,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] sm:text-xs text-teal-700 font-medium",
                                                    children: "Total Documents"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 276,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 274,
                                            columnNumber: 17
                                        }, this),
                                        earningsLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                            className: "h-4 w-4 animate-spin text-teal-600"
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 279,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm sm:text-base font-bold text-teal-700 whitespace-nowrap",
                                            children: earningsData?.totalDocuments ?? 0
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 281,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                    lineNumber: 273,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 272,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 271,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                    lineNumber: 253,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-2 gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                className: "border-2 border-teal-200",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                                        className: "p-2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                                    className: "text-sm sm:text-base",
                                                    children: "Earnings History"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 298,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            value: periodType,
                                                            onChange: (e)=>{
                                                                const newType = e.target.value;
                                                                setPeriodType(newType);
                                                                // Adjust periods if it exceeds the new max
                                                                const newMax = newType === 'monthly' ? 12 : 10;
                                                                if (periods > newMax) {
                                                                    setPeriods(newMax);
                                                                    setPeriodsInput(newMax.toString());
                                                                }
                                                            },
                                                            className: "px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "monthly",
                                                                    children: "Monthly"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                                    lineNumber: 314,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "yearly",
                                                                    children: "Yearly"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                                    lineNumber: 315,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                            lineNumber: 300,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "number",
                                                            min: "1",
                                                            max: maxPeriods,
                                                            value: periodsInput,
                                                            onChange: (e)=>{
                                                                const value = e.target.value;
                                                                setPeriodsInput(value);
                                                            },
                                                            className: "w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500",
                                                            placeholder: "Periods"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                            lineNumber: 317,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 299,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 297,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 296,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                        className: "p-2",
                                        children: earningsLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-center py-8",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                    className: "h-6 w-6 animate-spin text-teal-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 335,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ml-2 text-xs text-gray-600",
                                                    children: "Loading earnings data..."
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 336,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 334,
                                            columnNumber: 19
                                        }, this) : chartData.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                                            width: "100%",
                                            height: 300,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BarChart"], {
                                                data: chartData,
                                                barCategoryGap: "20%",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                                        strokeDasharray: "3 3",
                                                        stroke: "#e5e7eb"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 341,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                                        dataKey: "period",
                                                        stroke: "#6b7280",
                                                        style: {
                                                            fontSize: '10px'
                                                        },
                                                        angle: -45,
                                                        textAnchor: "end",
                                                        height: 60
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 342,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                                        stroke: "#6b7280",
                                                        style: {
                                                            fontSize: '10px'
                                                        },
                                                        tickFormatter: (value)=>`$${value.toLocaleString()}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 350,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                        formatter: (value)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(value),
                                                        labelStyle: {
                                                            color: '#374151',
                                                            fontSize: '12px'
                                                        },
                                                        contentStyle: {
                                                            fontSize: '12px'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 355,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Legend"], {
                                                        wrapperStyle: {
                                                            fontSize: '12px'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 360,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bar"], {
                                                        dataKey: "earnings",
                                                        fill: "#14b8a6",
                                                        name: "Earnings",
                                                        radius: [
                                                            4,
                                                            4,
                                                            0,
                                                            0
                                                        ]
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 361,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 340,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 339,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-center py-8 text-gray-500 text-xs",
                                            children: "No earnings data available"
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 365,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 332,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 295,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 293,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                className: "border-2 border-teal-200",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                                        className: "p-2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                                    className: "text-sm sm:text-base",
                                                    children: "Earnings Estimation"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 381,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            value: estimationPeriodType,
                                                            onChange: (e)=>{
                                                                const newType = e.target.value;
                                                                setEstimationPeriodType(newType);
                                                                // Adjust periods if it exceeds the new max
                                                                const newMax = newType === 'monthly' ? 12 : 10;
                                                                if (estimationPeriods > newMax) {
                                                                    setEstimationPeriods(newMax);
                                                                    setEstimationPeriodsInput(newMax.toString());
                                                                }
                                                            },
                                                            className: "px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "monthly",
                                                                    children: "Monthly"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                                    lineNumber: 397,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "yearly",
                                                                    children: "Yearly"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                                    lineNumber: 398,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                            lineNumber: 383,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "number",
                                                            min: "1",
                                                            max: maxEstimationPeriods,
                                                            value: estimationPeriodsInput,
                                                            onChange: (e)=>{
                                                                const value = e.target.value;
                                                                setEstimationPeriodsInput(value);
                                                            },
                                                            className: "w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500",
                                                            placeholder: "Periods"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                            lineNumber: 400,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 382,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 380,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 379,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                        className: "p-2",
                                        children: estimationLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-center py-8",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                    className: "h-6 w-6 animate-spin text-teal-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 418,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ml-2 text-xs text-gray-600",
                                                    children: "Loading estimation data..."
                                                }, void 0, false, {
                                                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                    lineNumber: 419,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 417,
                                            columnNumber: 19
                                        }, this) : earningsEstimation?.chartData && earningsEstimation.chartData.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                                            width: "100%",
                                            height: 300,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineChart"], {
                                                data: earningsEstimation.chartData,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                                        strokeDasharray: "3 3",
                                                        stroke: "#e5e7eb"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 424,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                                        dataKey: "label",
                                                        stroke: "#6b7280",
                                                        style: {
                                                            fontSize: '10px'
                                                        },
                                                        angle: -45,
                                                        textAnchor: "end",
                                                        height: 60
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 425,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                                        stroke: "#6b7280",
                                                        style: {
                                                            fontSize: '10px'
                                                        },
                                                        tickFormatter: (value)=>`$${value.toLocaleString()}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 433,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                        formatter: (value)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(value),
                                                        labelStyle: {
                                                            color: '#374151',
                                                            fontSize: '12px'
                                                        },
                                                        contentStyle: {
                                                            fontSize: '12px'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 438,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Legend"], {
                                                        wrapperStyle: {
                                                            fontSize: '12px'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 443,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"], {
                                                        type: "monotone",
                                                        dataKey: "actualEarnings",
                                                        stroke: "#14b8a6",
                                                        strokeWidth: 2,
                                                        name: "Actual Earnings",
                                                        dot: {
                                                            r: 3
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 444,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"], {
                                                        type: "monotone",
                                                        dataKey: "potentialEarnings",
                                                        stroke: "#f59e0b",
                                                        strokeWidth: 2,
                                                        name: "Potential Earnings",
                                                        dot: {
                                                            r: 3
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                        lineNumber: 452,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                                lineNumber: 423,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 422,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-center py-8 text-gray-500 text-xs",
                                            children: "No estimation data available"
                                        }, void 0, false, {
                                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                            lineNumber: 463,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                        lineNumber: 415,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                                lineNumber: 378,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                            lineNumber: 377,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
                    lineNumber: 291,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
            lineNumber: 180,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Frontend/app/(dashboard)/dashboard/page.tsx",
        lineNumber: 179,
        columnNumber: 5
    }, this);
}
_s(DashboardPage, "g+i2ZPbPfjTXalZtxaF+oJcLtDk=");
_c = DashboardPage;
var _c;
__turbopack_context__.k.register(_c, "DashboardPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Frontend_6ca48cb2._.js.map