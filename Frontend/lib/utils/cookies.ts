/**
 * Cookie utility functions for token and user data management
 */

import Cookies from 'js-cookie';

const TOKEN_COOKIE = 'auth_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const USER_COOKIE = 'user_data';
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // 'lax' allows cookies on external redirects (Stripe, etc.)
  path: '/',
};

export interface UserData {
  user: {
    id: string;
    email: string;
    name: string;
    pharmacy_name: string;
    phone?: string;
  };
  pharmacyId?: string;
}

/**
 * Set authentication token in cookie
 */
export function setToken(token: string): void {
  Cookies.set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
}

/**
 * Get authentication token from cookie
 */
export function getToken(): string | null {
  return Cookies.get(TOKEN_COOKIE) || null;
}

/**
 * Remove authentication token from cookie
 */
export function removeToken(): void {
  Cookies.remove(TOKEN_COOKIE, { path: '/' });
}

/**
 * Set refresh token in cookie
 */
export function setRefreshToken(refreshToken: string): void {
  Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
}

/**
 * Get refresh token from cookie
 */
export function getRefreshToken(): string | null {
  return Cookies.get(REFRESH_TOKEN_COOKIE) || null;
}

/**
 * Remove refresh token from cookie
 */
export function removeRefreshToken(): void {
  Cookies.remove(REFRESH_TOKEN_COOKIE, { path: '/' });
}

/**
 * Set user data in cookie
 */
export function setUserData(userData: UserData): void {
  Cookies.set(USER_COOKIE, JSON.stringify(userData), COOKIE_OPTIONS);
}

/**
 * Get user data from cookie
 */
export function getUserData(): UserData | null {
  const userData = Cookies.get(USER_COOKIE);
  if (userData) {
    try {
      return JSON.parse(userData) as UserData;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Remove user data from cookie
 */
export function removeUserData(): void {
  Cookies.remove(USER_COOKIE, { path: '/' });
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies(): void {
  removeToken();
  removeRefreshToken();
  removeUserData();
}

/**
 * Get pharmacy ID from user data
 */
export function getPharmacyId(): string | null {
  const userData = getUserData();
  return userData?.user?.id || userData?.pharmacyId || null;
}

