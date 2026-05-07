'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import { useAdminPortalTenant } from '@/lib/hooks/useAdminPortalTenant';

const DEFAULT_TITLE = 'PharmAdmin - Admin Portal';
const DEFAULT_FAVICON = '/favicon.ico';
const FAVICON_LINK_ID = 'branding-head-favicon';

interface CachedBranding {
    businessName: string | null;
    logoUrl: string | null;
}

// Read localStorage once per module load — not inside a render.
const cachedOnLoad: CachedBranding | null = (() => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem('adminBranding');
        return raw ? (JSON.parse(raw) as CachedBranding) : null;
    } catch {
        return null;
    }
})();

/**
 * Return the <link> element we own.
 *
 * IMPORTANT: we intentionally create and keep our OWN element rather than
 * mutating the one React/Next.js rendered for the static favicon.ico.
 *
 * Why:
 *  - React owns the <link rel="shortcut icon"> generated from app/favicon.ico.
 *    On every client-side navigation React reconciles the <head> and resets
 *    that element's `href` back to /favicon.ico.  If we "claimed" that element
 *    the brand logo would disappear on every route change.
 *  - Calling removeChild on a React-owned element triggers the Next.js 15 +
 *    React 19 reconciliation error (silent abort of the page mount → "click
 *    twice" regression).
 *  - Our own appended element is NEVER touched by React (no fiber), so it
 *    survives all client-side navigations with the brand logo URL intact.
 *  - The layout metadata has no explicit `icons` config, so Next.js only
 *    generates <link rel="shortcut icon"> (legacy, no type).  Our appended
 *    <link rel="icon"> comes LAST in the document and wins in all modern
 *    browsers: Chrome/Firefox/Safari use the last applicable icon link.
 */
const ensureFaviconLink = (): HTMLLinkElement | null => {
    if (typeof document === 'undefined') return null;

    let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
    if (link) return link;

    link = document.createElement('link');
    link.id = FAVICON_LINK_ID;
    link.rel = 'icon';
    document.head.appendChild(link);
    return link;
};

export default function BrandingHead() {
    // Narrow selectors so this component only re-renders when branding changes,
    // not on every unrelated Redux action.
    const reduxBusinessName = useAppSelector(
        (state) => state.settings.settings?.businessName ?? null
    );
    const reduxLogoUrl = useAppSelector(
        (state) => state.settings.settings?.logoUrl ?? null
    );

    const { validTenant } = useAdminPortalTenant();

    const lastTitleRef = useRef<string | null>(null);
    const lastFaviconRef = useRef<string | null>(null);

    const businessName =
        reduxBusinessName ||
        validTenant?.buyingGroupName ||
        cachedOnLoad?.businessName ||
        null;

    const logoUrl =
        reduxLogoUrl ||
        validTenant?.logoUrl ||
        cachedOnLoad?.logoUrl ||
        null;

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const nextTitle = businessName || DEFAULT_TITLE;
        if (lastTitleRef.current === nextTitle) return;
        lastTitleRef.current = nextTitle;
        document.title = nextTitle;
    }, [businessName]);

    useEffect(() => {
        const nextFavicon = logoUrl || DEFAULT_FAVICON;
        if (lastFaviconRef.current === nextFavicon) return;
        lastFaviconRef.current = nextFavicon;
        const link = ensureFaviconLink();
        if (!link) return;
        link.href = nextFavicon;
    }, [logoUrl]);

    return null;
}
