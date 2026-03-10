import Cookies from 'js-cookie';

const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 7, // 7 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

export const cookieUtils = {
  /**
   * Set a cookie
   */
  set: (name: string, value: string, options?: Cookies.CookieAttributes) => {
    Cookies.set(name, value, { ...COOKIE_OPTIONS, ...options });
  },

  /**
   * Get a cookie
   */
  get: (name: string): string | undefined => {
    return Cookies.get(name);
  },

  /**
   * Remove a cookie
   */
  remove: (name: string, options?: Cookies.CookieAttributes) => {
    Cookies.remove(name, { ...COOKIE_OPTIONS, ...options });
  },

  /**
   * Set auth token
   */
  setAuthToken: (token: string) => {
    cookieUtils.set('auth_token', token);
  },

  /**
   * Get auth token
   */
  getAuthToken: (): string | null => {
    return cookieUtils.get('auth_token') || null;
  },

  /**
   * Set user data
   */
  setUser: (user: any) => {
    cookieUtils.set('auth_user', JSON.stringify(user));
  },

  /**
   * Get user data
   */
  getUser: (): any | null => {
    const userStr = cookieUtils.get('auth_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Clear auth cookies
   */
  clearAuth: () => {
    cookieUtils.remove('auth_token');
    cookieUtils.remove('auth_user');
  },
};

