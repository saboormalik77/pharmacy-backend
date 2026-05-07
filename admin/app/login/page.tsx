'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { loginUser, clearError } from '@/lib/store/authSlice';
import { DomainNotRecognizedScreen } from '@/components/auth/DomainNotRecognizedScreen';
import { TenantInfoLoadingScreen } from '@/components/auth/TenantInfoLoadingScreen';

interface AdminBranding {
  logoUrl: string | null;
  businessName: string | null;
}

interface TenantInfo {
  buyingGroupId: string;
  domain: string;
  portalType: 'admin' | 'pharmacy' | 'unknown';
  isActive: boolean;
  buyingGroupName: string;
  logoUrl?: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error: authError } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branding, setBranding] = useState<AdminBranding>({ logoUrl: null, businessName: null });
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [tenantChecked, setTenantChecked] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('adminBranding');
      if (stored) {
        const parsedBranding = JSON.parse(stored);
        setBranding(parsedBranding);
        if (parsedBranding.businessName) {
          document.title = `${parsedBranding.businessName} - Admin Login`;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (branding.logoUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.logoUrl;
    }
  }, [branding.logoUrl]);

  // Skip tenant API wait on localhost before paint (avoids a loader flash).
  useLayoutEffect(() => {
    const h = window.location.hostname;
    if (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h.endsWith('.localhost')
    ) {
      setTenantChecked(true);
    }
  }, []);

  // Fetch tenant info (multi-tenant): validates the domain and pulls branding.
  // - localhost -> skip the check entirely (dev mode allows any login)
  // - real host -> tenant-info MUST succeed and resolve to an admin portal
  useEffect(() => {
    const fetchTenantInfo = async () => {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.localhost');

      if (isLocal) {
        setTenantChecked(true);
        return;
      }

      try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const resp = await apiClient.get<{
          status: string;
          data: { isLocalDev: boolean; tenant: TenantInfo | null };
        }>('/auth/tenant-info', false, { role: 'admin' });

        const tenant = resp?.data?.tenant;
        if (!tenant) {
          setTenantError('This domain is not registered for any buying group.');
          return;
        }
        if (tenant.portalType !== 'admin') {
          setTenantError('This domain is not configured for admin access.');
          return;
        }
        const updatedBranding = {
          logoUrl: tenant.logoUrl || branding.logoUrl,
          businessName: tenant.buyingGroupName,
        };
        setBranding(updatedBranding);
        localStorage.setItem('adminBranding', JSON.stringify(updatedBranding));
        if (tenant.buyingGroupName) {
          document.title = `${tenant.buyingGroupName} - Admin Login`;
        }
      } catch (err: any) {
        setTenantError(
          err?.message || 'Unable to verify this domain. Access denied.'
        );
      } finally {
        setTenantChecked(true);
      }
    };
    fetchTenantInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Clear error when component mounts or when authError changes
  useEffect(() => {
    if (authError) {
      setError(authError);
      // Clear the error from Redux store after displaying it
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hostname : '';
    const local =
      h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
    if (!local && tenantChecked && tenantError) {
      document.title = 'Domain not recognized';
    }
  }, [tenantChecked, tenantError]);

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost');

  if (!isLocalHost && !tenantChecked) {
    return <TenantInfoLoadingScreen />;
  }

  if (!isLocalHost && tenantChecked && tenantError) {
    return <DomainNotRecognizedScreen detail={tenantError} />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    try {
      const result = await dispatch(loginUser({ email, password }));
      
      if (loginUser.fulfilled.match(result)) {
        // Navigation will be handled by ProtectedRoute
        router.push('/');
      } else {
        // Set error without causing any refresh
        const errorMessage = result.payload as string || 'Invalid credentials. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      // Catch any unexpected errors
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt="Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-[4px] object-contain mx-auto mb-4 block"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-[#1d2222] rounded-[4px] mb-4 mx-auto">
              <Shield className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {branding.businessName || 'Buying group'}
          </h1>
          <p className="text-gray-600">{branding.businessName || 'Buying group'} Management Portal Login</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[4px] shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[4px] text-sm">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="admin@buyinggroup.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#1d2222] border-gray-300 rounded focus:ring-slate-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-[#1d2222] hover:text-[#516057] font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading || !!tenantError || !tenantChecked}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6" suppressHydrationWarning>
          © {new Date().getFullYear()} Buying group. All rights reserved.
        </p>
      </div>
    </div>
  );
}

