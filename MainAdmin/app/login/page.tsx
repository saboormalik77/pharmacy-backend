'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { loginUser, clearError } from '@/lib/store/authSlice';
import { validateEmail } from '@/lib/validation';
import { getFirstAllowedPath } from '@/lib/permissions';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error: authError, user } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(getFirstAllowedPath(user) || '/');
    }
  }, [isAuthenticated, isLoading, router, user]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    const newFieldErrors: Record<string, string> = {};
    const emailResult = validateEmail(email);
    if (!emailResult.valid) newFieldErrors.email = emailResult.error!;
    if (!password.trim()) newFieldErrors.password = 'Password is required.';
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }
    setFieldErrors({});

    try {
      const result = await dispatch(loginUser({ email, password }));

      if (loginUser.fulfilled.match(result)) {
        router.push(getFirstAllowedPath(result.payload.user) || '/');
      } else {
        const errorMessage = result.payload as string || 'Invalid credentials. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-[4px] mb-4 shadow-md"
              style={{ backgroundColor: 'var(--primary)' }}
            >
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading text-headline mb-2" style={{ color: 'var(--foreground)' }}>Admin</h1>
          <p style={{ color: 'var(--on-surface-variant)' }}>Buying Group Management Portal</p>
        </div>

        <div className="rounded-[4px] shadow-md p-6" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {error && (
              <div style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="font-body block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--outline)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-[4px] focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ borderColor: 'var(--outline-variant)' }}
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="font-body block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--outline)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                  className="w-full pl-10 pr-12 py-2.5 border rounded-[4px] focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ borderColor: 'var(--outline-variant)' }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                  style={{ color: 'var(--outline)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
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

        <p className="text-center text-sm mt-6" style={{ color: 'var(--on-surface-variant)' }} suppressHydrationWarning>
          &copy; {new Date().getFullYear()} Admin Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
