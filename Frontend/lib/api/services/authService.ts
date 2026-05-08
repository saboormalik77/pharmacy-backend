/**
 * Authentication API Service
 */

import { apiClient } from '../client';
import { setToken, setRefreshToken, setUserData, clearAuthCookies, getUserData, getToken, getRefreshToken } from '@/lib/utils/cookies';
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore';

export interface SignupData {
  email: string;
  password: string;
  name: string;
  pharmacyName: string;
  npiNumber: string;
  deaNumber: string;
  phone?: string;
  physicalAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface SigninData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    pharmacy_name: string;
    phone?: string;
  };
  token: string;
  refreshToken: string;
  session: any;
}

export const authService = {
  /**
   * Sign up a new user
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data, false);
    if (response.status === 'success' && response.data) {
      // Store token, refresh token, and user data in cookies
      if (typeof window !== 'undefined') {
        setToken(response.data.token);
        if (response.data.refreshToken) {
          setRefreshToken(response.data.refreshToken);
        }
        setUserData({
          user: response.data.user,
          pharmacyId: response.data.user.id,
        });
      }
      return response.data;
    }
    throw new Error(response.message || 'Signup failed');
  },

  /**
   * Sign in an existing user
   */
  async signin(data: SigninData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signin', data, false);
    if (response.status === 'success' && response.data) {
      // Store token, refresh token, and user data in cookies
      if (typeof window !== 'undefined') {
        setToken(response.data.token);
        if (response.data.refreshToken) {
          setRefreshToken(response.data.refreshToken);
        }
        setUserData({
          user: response.data.user,
          pharmacyId: response.data.user.id,
        });
      }
      return response.data;
    }
    throw new Error(response.message || 'Signin failed');
  },

  /**
   * Sign in via Google (Clerk OAuth) — looks up pharmacy by email
   */
  async googleSignin(email: string): Promise<AuthResponse> {
    console.log('authService.googleSignin called with email:', email);
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/google-signin', { email }, false);
      console.log('Backend response:', response);
      
      if (response.status === 'success' && response.data) {
        if (typeof window !== 'undefined') {
          setToken(response.data.token);
          if (response.data.refreshToken) {
            setRefreshToken(response.data.refreshToken);
          }
          setUserData({
            user: response.data.user,
            pharmacyId: response.data.user.id,
          });
        }
        console.log('Google sign-in successful');
        return response.data;
      }
      
      throw new Error(response.message || 'Google sign-in failed');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // The API client already extracted the error message from the backend response
      // Just re-throw it with the exact message
      throw new Error(error.message || 'Google sign-in failed. Please try again or contact support.');
    }
  },

  /**
   * Sign out current user
   */
  signout(): void {
    if (typeof window !== 'undefined') {
      clearAuthCookies();
    }
  },

  /**
   * Get current user from cookies
   */
  getCurrentUser(): AuthResponse['user'] | null {
    if (typeof window === 'undefined') return null;
    const userData = getUserData();
    return userData?.user || null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  /**
   * Request a password reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/forgot-password',
      { 
        email,
        redirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/reset-password`
          : undefined
      },
      false
    );
    if (response.status === 'success') {
      return { message: response.message || 'Password reset email sent' };
    }
    throw new Error(response.message || 'Failed to send password reset email');
  },

  /**
   * Reset password using access token from email link
   */
  async resetPassword(accessToken: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/reset-password',
      { accessToken, newPassword },
      false
    );
    if (response.status === 'success') {
      return { message: response.message || 'Password reset successfully' };
    }
    throw new Error(response.message || 'Failed to reset password');
  },

  /**
   * Verify if a reset token is valid
   */
  async verifyResetToken(accessToken: string): Promise<{ valid: boolean; email?: string }> {
    const response = await apiClient.post<{ valid: boolean; email?: string }>(
      '/auth/verify-reset-token',
      { accessToken },
      false
    );
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    return { valid: false };
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      // No refresh token, user needs to login again
      if (typeof window !== 'undefined') {
        usePharmacyContextStore.getState().startSignOut();
        clearAuthCookies();
        window.location.href = '/login';
      }
      return null;
    }

    try {
      const response = await apiClient.post<{ token: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
        false
      );

      if (response.status === 'success' && response.data) {
        // Update stored tokens
        if (typeof window !== 'undefined') {
          setToken(response.data.token);
          if (response.data.refreshToken) {
            setRefreshToken(response.data.refreshToken);
          }
        }
        return response.data.token;
      }

      // Refresh token expired or invalid
      if (typeof window !== 'undefined') {
        usePharmacyContextStore.getState().startSignOut();
        clearAuthCookies();
        window.location.href = '/login';
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      if (typeof window !== 'undefined') {
        usePharmacyContextStore.getState().startSignOut();
        clearAuthCookies();
        window.location.href = '/login';
      }
      return null;
    }
  },
};

