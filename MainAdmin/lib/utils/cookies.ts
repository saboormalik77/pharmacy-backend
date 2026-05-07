import Cookies from 'js-cookie';

const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 7,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

export const cookieUtils = {
  set: (name: string, value: string, options?: Cookies.CookieAttributes) => {
    Cookies.set(name, value, { ...COOKIE_OPTIONS, ...options });
  },

  get: (name: string): string | undefined => {
    return Cookies.get(name);
  },

  remove: (name: string, options?: Cookies.CookieAttributes) => {
    Cookies.remove(name, { ...COOKIE_OPTIONS, ...options });
  },

  setAuthToken: (token: string) => {
    cookieUtils.set('main_admin_token', token);
  },

  getAuthToken: (): string | null => {
    return cookieUtils.get('main_admin_token') || null;
  },

  setUser: (user: any) => {
    cookieUtils.set('main_admin_user', JSON.stringify(user));
  },

  getUser: (): any | null => {
    const userStr = cookieUtils.get('main_admin_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  clearAuth: () => {
    cookieUtils.remove('main_admin_token');
    cookieUtils.remove('main_admin_user');
  },
};
